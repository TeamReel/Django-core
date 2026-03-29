"""Configure per-organisation payer routing (production-friendly).

This stores the routing in the B10 Settings system so it can be changed later
without code changes or Railway env var tweaks.

Key: transactions_payer_routing_default
Scope: ORGANISATION
Type: STRING

Allowed values:
- explicit
- user_project_org
- project_user_org

Example:
    $env:DATABASE_URL="postgresql://..."; python manage.py set_transactions_payer_routing \
        --org knvb --value user_project_org
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from organisations.models import Organisation
from settings.models import ScopeType, Setting, SettingType


class Command(BaseCommand):
    help = "Set transactions payer routing default for an organisation (B10 Setting)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org",
            type=str,
            required=False,
            help="Organisation slug (e.g. knvb). Omit when using --global.",
        )
        parser.add_argument(
            "--global",
            action="store_true",
            help="Set the GLOBAL default (applies when no org override exists)",
        )
        parser.add_argument(
            "--value",
            type=str,
            required=True,
            choices=["explicit", "user_project_org", "project_user_org"],
            help="Routing strategy",
        )

    def handle(self, *args, **options):
        org_slug = options.get("org")
        global_scope: bool = bool(options.get("global"))
        value: str = options["value"]

        org = None
        if global_scope:
            if org_slug:
                self.stderr.write("Do not pass --org when using --global")
                return
        else:
            if not org_slug:
                self.stderr.write("--org is required unless using --global")
                return
            org = Organisation.objects.filter(slug=org_slug).first()
            if not org:
                self.stderr.write(f"Organisation '{org_slug}' not found")
                return

        setting, created = Setting.objects.update_or_create(
            key="transactions_payer_routing_default",
            scope_type=ScopeType.GLOBAL if global_scope else ScopeType.ORGANISATION,
            organisation=None if global_scope else org,
            project=None,
            user=None,
            defaults={
                "value_type": SettingType.STRING,
                "value": value,
                "default_value": "explicit",
                "description": "Default payer routing for transaction debits (Option B fallback)",
            },
        )

        action = "created" if created else "updated"
        if global_scope:
            self.stdout.write(
                f"transactions_payer_routing_default {action} GLOBAL = '{setting.value}'"
            )
        else:
            self.stdout.write(
                f"transactions_payer_routing_default {action}"
                f" for org '{org.slug}' = '{setting.value}'"
            )
