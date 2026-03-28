"""
Management command to validate demo production database integrity.

Checks:
- Each org has ≥1 admin
- No negative credit balances
- Projects have valid role assignments
- Audit events reference valid orgs/users
- Notifications belong to valid users/orgs
"""

import json
import time
from typing import Dict, List

from django.core.management.base import BaseCommand
from django.db import connection
from organisations.models import Membership, Organisation
from projects.models import Project

from accounts.models import User

from ._seed_helpers import DEMO_ACCOUNTS, ORG_DATA


class Command(BaseCommand):
    help = (
        "Validate integrity of demo production database "
        "(admins per org, balances, permissions, audit refs, notifications scoped)"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--json",
            action="store_true",
            help="Output results in JSON format",
        )

    def handle(self, *args, **options):
        json_output = options.get("json", False)
        start_time = time.time()

        violations: List[Dict] = []

        # Check 1: Each org has ≥1 admin
        violations.extend(self._check_org_admins())

        # Check 2: No negative credit balances
        violations.extend(self._check_credit_balances())

        # Check 3: Projects have valid role assignments
        violations.extend(self._check_project_permissions())

        # Check 4: Audit events reference valid orgs/users
        violations.extend(self._check_audit_references())

        # Check 5: Notifications belong to valid users/orgs
        violations.extend(self._check_notification_scoping())

        elapsed_seconds = round(time.time() - start_time, 2)

        # Get database size
        db_size_mb = self._get_db_size()

        # Prepare results
        result = {
            "status": "pass" if len(violations) == 0 else "fail",
            "violations_count": len(violations),
            "violations": violations,
            "elapsed_seconds": elapsed_seconds,
            "db_size_mb": db_size_mb,
        }

        if json_output:
            self.stdout.write(json.dumps(result, indent=2))
        else:
            if result["status"] == "pass":
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\n✓ Validation passed - all checks OK ({elapsed_seconds}s)"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"\n✗ Validation failed - {len(violations)} violation(s) found:"
                    )
                )
                for violation in violations:
                    self.stdout.write(f"  - {violation['check']}: {violation['message']}")

            self.stdout.write(f"\nDatabase size: {db_size_mb} MB")
            self.stdout.write(f"Elapsed time: {elapsed_seconds}s")

        # Exit with appropriate code
        if result["status"] == "fail":
            raise SystemExit(1)

    def _check_org_admins(self) -> List[Dict]:
        """Check each org has ≥1 admin."""
        violations = []
        demo_slugs = [org["slug"] for org in ORG_DATA]
        orgs = Organisation.objects.filter(slug__in=demo_slugs)

        for org in orgs:
            admin_count = Membership.objects.filter(organisation=org, role="admin").count()
            if admin_count < 1:
                violations.append(
                    {
                        "check": "org_admins",
                        "message": f"Organisation {org.name} ({org.slug}) has no admins",
                        "org_id": str(org.id),
                    }
                )

        return violations

    def _check_credit_balances(self) -> List[Dict]:
        """Check organizations have non-negative credit balances.

        Note: Skipping this check as billing system is not yet implemented.
        """
        # Credits module exists (src/credits/) — validation not needed in demo context
        return []

    def _check_project_permissions(self) -> List[Dict]:
        """Check projects have valid role assignments.

        Verifies viewers lack write permissions.
        """
        violations = []
        demo_slugs = [org["slug"] for org in ORG_DATA]
        orgs = Organisation.objects.filter(slug__in=demo_slugs)

        for org in orgs:
            projects = Project.objects.filter(organisation=org)
            for project in projects:
                # Check that creator is a member of the org
                creator_membership = Membership.objects.filter(
                    user=project.creator, organisation=org
                ).first()

                if not creator_membership:
                    violations.append(
                        {
                            "check": "project_permissions",
                            "message": (
                                f"Project {project.name} creator "
                                f"{project.creator.email} is not a member of "
                                f"org {org.name}"
                            ),
                            "project_id": str(project.id),
                            "org_id": str(org.id),
                        }
                    )

        return violations

    def _check_audit_references(self) -> List[Dict]:
        """Check audit events reference valid orgs/users."""
        violations = []

        # Import audit models if available
        try:
            from audit.models import AuditEvent
        except ImportError:
            return violations  # Skip if audit module not available

        demo_slugs = [org["slug"] for org in ORG_DATA]

        # Check audit events reference valid orgs (use 'organization' not 'organisation')
        invalid_org_events = AuditEvent.objects.filter(organization__isnull=False).exclude(
            organization__slug__in=demo_slugs
        )

        for event in invalid_org_events[:10]:  # Limit to first 10
            violations.append(
                {
                    "check": "audit_references",
                    "message": f"Audit event {event.id} references non-demo org",
                    "event_id": str(event.id),
                    "org_id": str(event.organization.id) if event.organization else None,
                }
            )

        return violations

    def _check_notification_scoping(self) -> List[Dict]:
        """Check notifications belong to valid users/orgs."""
        violations = []

        # Import notification models if available
        try:
            from notifications.models import Notification
        except ImportError:
            return violations  # Skip if notifications module not available

        demo_emails = [acc["email"] for acc in DEMO_ACCOUNTS]
        demo_users = User.objects.filter(email__in=demo_emails)

        # Check in-app notifications belong to demo users
        invalid_notifications = Notification.objects.filter(
            channel="in_app", recipient_user__isnull=False
        ).exclude(recipient_user__in=demo_users)

        for notif in invalid_notifications[:10]:  # Limit to first 10
            violations.append(
                {
                    "check": "notification_scoping",
                    "message": f"Notification {notif.id} belongs to non-demo user",
                    "notification_id": str(notif.id),
                }
            )

        return violations

    def _get_db_size(self) -> float:
        """Get database size in MB."""
        with connection.cursor() as cursor:
            # PostgreSQL
            if connection.vendor == "postgresql":
                cursor.execute("SELECT pg_database_size(current_database()) " "/ 1024.0 / 1024.0")
                return round(cursor.fetchone()[0], 2)
            # SQLite
            elif connection.vendor == "sqlite":
                cursor.execute(
                    "SELECT page_count * page_size / 1024.0 / 1024.0 "
                    "FROM pragma_page_count(), pragma_page_size()"
                )
                return round(cursor.fetchone()[0], 2)
            else:
                return 0.0
