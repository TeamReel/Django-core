---
work_package_id: WP01
title: Database & Model Foundation
lane: "doing"
subtasks: [T001, T002, T003, T004, T005, T006]
priority: P1
estimated_effort: 2-3 days
dependencies: []
agent: "copilot"
shell_pid: "43940"
history:
  - date: 2026-01-04
    action: created
    author: spec-kitty.tasks
---

# WP01: Database & Model Foundation

## Objective

Establish core data models for B26 Project-Level Access Control:
- Extend `Project` model with privacy flag
- Create `ProjectMembership` (explicit access with soft delete)
- Create `ProjectInvite` (token-based invitation system)
- Create `ProjectMembershipPromotion` (admin acceptance workflow)
- Add validation rules (last admin protection, duplicate prevention)
- Register models in Django Admin

**Why this is the foundation**: All other work packages depend on these models. Permission resolution, membership management, and invitation workflows all require these database structures.

## Context

**Feature**: B26 Project-Level Access Control
**User Stories**: Foundation for US1-US9
**Integration Points**:
- B08 Hierarchical Access Control (permission checks)
- B09 Audit Logging (membership lifecycle events)
- B10 Feature Flags (extensibility)

**Key Architectural Decisions** (from research.md):
- Soft delete pattern for ProjectMembership (preserves audit history)
- Separate ProjectMembershipPromotion entity (enables sophisticated approval workflows)
- Token-based invitations with 7-day expiry
- Suspicious promotion detection (<24h org membership)

## Detailed Guidance

### T001: Extend Project Model with is_private Field

**Location**: `apps/projects/models/project.py`

**Changes**:
```python
class Project(BaseModel):
    # Existing fields: id, organisation, name, slug, description, created_at, updated_at

    # NEW FIELD
    is_private = models.BooleanField(
        default=False,
        help_text="When True, org members do NOT have automatic access. "
                  "Only explicit ProjectMembership grants access. "
                  "Org admins can override with audit trail (if feature flag enabled)."
    )

    class Meta:
        db_table = 'projects'
        indexes = [
            # Existing indexes...
            models.Index(fields=['organisation', 'is_private']),  # NEW
        ]

    def __str__(self):
        privacy_badge = " [PRIVATE]" if self.is_private else ""
        return f"{self.name}{privacy_badge}"
```

**Migration**:
```bash
python manage.py makemigrations projects --name add_is_private_field
```

**Expected migration file** (`0002_project_add_is_private.py`):
```python
operations = [
    migrations.AddField(
        model_name='project',
        name='is_private',
        field=models.BooleanField(default=False, help_text='...'),
    ),
    migrations.AddIndex(
        model_name='project',
        index=models.Index(fields=['organisation', 'is_private'], name='projects_org_priv_idx'),
    ),
]
```

**Validation**:
- Run migration: `python manage.py migrate`
- Check database: `\d+ projects` in psql → verify `is_private` column exists
- Verify index: Check `projects_org_priv_idx` in indexes list

---

### T002: Create ProjectMembership Model

**Location**: `apps/projects/models/project_membership.py` (NEW FILE)

**Full Model**:
```python
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class ProjectMembershipManager(models.Manager):
    """Custom manager for active memberships."""

    def active(self):
        """Return only non-deleted memberships."""
        return self.filter(deleted_at__isnull=True)


class ProjectMembership(models.Model):
    """
    Explicit project membership with role assignment.
    Overrides organization-based access rules.
    Soft delete pattern preserves audit history.
    """

    class Role(models.TextChoices):
        VIEWER = 'viewer', 'Viewer'
        EDITOR = 'editor', 'Editor'
        ADMIN = 'admin', 'Admin'

    class AssignmentReason(models.TextChoices):
        MANUAL = 'manual', 'Manual Assignment'
        INVITATION = 'invitation', 'Accepted Invitation'
        PROMOTION = 'promotion', 'Role Promotion'
        ORG_DEFAULT = 'org_default', 'Organization Default'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='project_memberships'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER
    )
    assignment_reason = models.CharField(
        max_length=20,
        choices=AssignmentReason.choices,
        default=AssignmentReason.MANUAL
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = ProjectMembershipManager()

    class Meta:
        db_table = 'project_memberships'
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'user'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_membership'
            )
        ]
        indexes = [
            models.Index(fields=['project', 'deleted_at']),
            models.Index(fields=['user', 'deleted_at']),
            models.Index(fields=['project', 'role', 'deleted_at']),
        ]

    def __str__(self):
        status = " [DELETED]" if self.deleted_at else ""
        return f"{self.user.email} - {self.project.name} ({self.role}){status}"

    def clean(self):
        """Validate last admin protection."""
        if self.deleted_at and self.role == self.Role.ADMIN:
            active_admins = ProjectMembership.objects.active().filter(
                project=self.project,
                role=self.Role.ADMIN
            ).exclude(id=self.id).count()

            if active_admins == 0:
                raise ValidationError(
                    "Cannot remove the last admin from the project. "
                    "Assign another admin first or an org admin will be auto-assigned."
                )

    def soft_delete(self):
        """Soft delete this membership."""
        self.deleted_at = timezone.now()
        self.full_clean()  # Triggers validation
        self.save()
```

**Migration**:
```bash
python manage.py makemigrations projects --name create_project_membership
```

**Validation**:
- Run migration
- Test in Django shell:
  ```python
  from apps.projects.models import Project, ProjectMembership
  from apps.accounts.models import User

  project = Project.objects.first()
  user = User.objects.first()

  # Create membership
  membership = ProjectMembership.objects.create(
      project=project,
      user=user,
      role=ProjectMembership.Role.EDITOR
  )
  print(f"Created: {membership}")

  # Test unique constraint (should raise IntegrityError)
  try:
      duplicate = ProjectMembership.objects.create(project=project, user=user, role='viewer')
  except Exception as e:
      print(f"✓ Unique constraint working: {e}")

  # Test soft delete
  membership.soft_delete()
  print(f"Soft deleted: {membership.deleted_at}")

  # Can create again after soft delete
  new_membership = ProjectMembership.objects.create(project=project, user=user, role='viewer')
  print(f"✓ Can recreate after soft delete: {new_membership}")
  ```

---

### T003: Create ProjectInvite Model

**Location**: `apps/projects/models/project_invite.py` (NEW FILE)

**Full Model**:
```python
import uuid
import secrets
from datetime import timedelta
from django.db import models
from django.utils import timezone


class ProjectInvite(models.Model):
    """
    Email-based project invitation with token acceptance.
    Expires after 7 days (configurable via feature flag).
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        CANCELLED = 'cancelled', 'Cancelled'
        EXPIRED = 'expired', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=20,
        choices=ProjectMembership.Role.choices
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="URL-safe token for magic link acceptance"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    invited_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_project_invitations'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'project_invites'
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['expires_at', 'status']),
        ]

    def __str__(self):
        return f"Invite: {self.email} → {self.project.name} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = self.generate_token()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @staticmethod
    def generate_token():
        """Generate cryptographically secure URL-safe token."""
        return secrets.token_urlsafe(32)  # 32 bytes = 43 characters base64

    def is_expired(self):
        """Check if invitation has expired."""
        return timezone.now() > self.expires_at

    def send_invitation_email(self):
        """Queue invitation email via B16 Celery task."""
        from apps.notifications.tasks import send_project_invitation_email
        send_project_invitation_email.delay(str(self.id))
```

**Migration**:
```bash
python manage.py makemigrations projects --name create_project_invite
```

**Validation**:
- Test token generation:
  ```python
  from apps.projects.models import ProjectInvite, Project

  project = Project.objects.first()
  invite = ProjectInvite.objects.create(
      project=project,
      email="test@example.com",
      role="editor"
  )

  print(f"Token generated: {invite.token}")  # Should be 43 chars
  print(f"Expires at: {invite.expires_at}")  # Should be 7 days from now
  print(f"Is expired: {invite.is_expired()}")  # Should be False
  ```

---

### T004: Create ProjectMembershipPromotion Model

**Location**: `apps/projects/models/project_membership_promotion.py` (NEW FILE)

**Full Model**:
```python
import uuid
from datetime import timedelta
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class ProjectMembershipPromotion(models.Model):
    """
    Role promotion request requiring target user acceptance.
    Triggered when promoting to admin (if below org role threshold).
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='promotions'
    )
    target_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='received_promotions'
    )
    requested_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='requested_promotions'
    )
    from_role = models.CharField(
        max_length=20,
        choices=ProjectMembership.Role.choices
    )
    to_role = models.CharField(
        max_length=20,
        choices=ProjectMembership.Role.choices
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    is_suspicious = models.BooleanField(
        default=False,
        help_text="Flagged if user joined org <24h ago"
    )
    suspicious_reason = models.TextField(
        blank=True,
        help_text="Explanation for suspicious flag"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'project_membership_promotions'
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['target_user', 'status']),
            models.Index(fields=['expires_at', 'status']),
        ]

    def __str__(self):
        return f"Promotion: {self.target_user.email} {self.from_role}→{self.to_role} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def clean(self):
        """Validate upward promotion only."""
        role_hierarchy = {
            ProjectMembership.Role.VIEWER: 1,
            ProjectMembership.Role.EDITOR: 2,
            ProjectMembership.Role.ADMIN: 3
        }
        if role_hierarchy[self.from_role] >= role_hierarchy[self.to_role]:
            raise ValidationError("Promotion must be to a higher role.")

    def check_suspicious(self):
        """Check if user joined org <24h ago."""
        from apps.organizations.models import OrganizationMembership

        try:
            org_membership = OrganizationMembership.objects.get(
                organization=self.project.organisation,
                user=self.target_user
            )
            time_in_org = timezone.now() - org_membership.created_at

            if time_in_org < timedelta(hours=24):
                self.is_suspicious = True
                self.suspicious_reason = f"User joined organization {time_in_org.total_seconds() / 3600:.1f} hours ago (threshold: 24h)"
                return True
        except OrganizationMembership.DoesNotExist:
            # External user, no org membership
            pass

        return False

    def accept(self):
        """Accept promotion and update membership role."""
        from apps.projects.services.membership_service import MembershipService

        if self.status != self.Status.PENDING:
            raise ValidationError(f"Cannot accept promotion with status: {self.status}")

        # Update membership role
        membership = ProjectMembership.objects.get(
            project=self.project,
            user=self.target_user
        )
        membership.role = self.to_role
        membership.save()

        # Update promotion status
        self.status = self.Status.ACCEPTED
        self.resolved_at = timezone.now()
        self.save()

        # Invalidate permission cache
        from apps.projects.services.cache_service import CacheService
        CacheService().invalidate_user_project_permissions(
            user_id=str(self.target_user.id),
            project_id=str(self.project.id)
        )

        return membership

    def decline(self, reason=None):
        """Decline promotion."""
        if self.status != self.Status.PENDING:
            raise ValidationError(f"Cannot decline promotion with status: {self.status}")

        self.status = self.Status.DECLINED
        self.resolved_at = timezone.now()
        if reason:
            self.suspicious_reason = f"Decline reason: {reason}"
        self.save()
```

**Migration**:
```bash
python manage.py makemigrations projects --name create_project_membership_promotion
```

**Validation**:
- Test suspicious detection:
  ```python
  from apps.projects.models import ProjectMembershipPromotion
  from django.utils import timezone
  from datetime import timedelta

  # Create recent org membership
  org_member = OrganizationMembership.objects.create(
      organization=project.organisation,
      user=user,
      role='member'
  )
  org_member.created_at = timezone.now() - timedelta(hours=12)
  org_member.save()

  # Create promotion
  promotion = ProjectMembershipPromotion.objects.create(
      project=project,
      target_user=user,
      requested_by=admin_user,
      from_role='editor',
      to_role='admin'
  )

  # Check suspicious
  is_suspicious = promotion.check_suspicious()
  print(f"✓ Suspicious detected: {is_suspicious}")  # Should be True
  print(f"Reason: {promotion.suspicious_reason}")
  ```

---

### T005: Add Model Validation Rules

**Testing File**: `tests/unit/apps/projects/test_model_validation.py` (NEW FILE)

**Test Cases**:
```python
import pytest
from django.core.exceptions import ValidationError
from apps.projects.models import ProjectMembership, ProjectInvite, ProjectMembershipPromotion


@pytest.mark.django_db
class TestProjectMembershipValidation:

    def test_cannot_remove_last_admin(self, project, admin_user):
        """Test last admin protection."""
        membership = ProjectMembership.objects.create(
            project=project,
            user=admin_user,
            role=ProjectMembership.Role.ADMIN
        )

        # Should raise ValidationError
        with pytest.raises(ValidationError, match="Cannot remove the last admin"):
            membership.soft_delete()

    def test_duplicate_active_membership_prevented(self, project, user):
        """Test unique constraint on active memberships."""
        ProjectMembership.objects.create(project=project, user=user, role='editor')

        with pytest.raises(ValidationError):
            ProjectMembership.objects.create(project=project, user=user, role='viewer')

    def test_can_recreate_after_soft_delete(self, project, user):
        """Test soft delete allows recreation."""
        membership = ProjectMembership.objects.create(project=project, user=user, role='editor')
        membership.soft_delete()

        # Should succeed
        new_membership = ProjectMembership.objects.create(project=project, user=user, role='viewer')
        assert new_membership.role == 'viewer'


@pytest.mark.django_db
class TestProjectInviteValidation:

    def test_email_not_already_member(self, project, user):
        """Test cannot invite existing member."""
        ProjectMembership.objects.create(project=project, user=user, role='editor')

        # Invite with same email should fail validation
        invite = ProjectInvite(project=project, email=user.email, role='viewer')
        with pytest.raises(ValidationError, match="already a member"):
            invite.clean()


@pytest.mark.django_db
class TestProjectMembershipPromotionValidation:

    def test_only_upward_promotions(self, project, user):
        """Test demotion not allowed via promotion model."""
        promotion = ProjectMembershipPromotion(
            project=project,
            target_user=user,
            from_role='admin',
            to_role='editor'  # Downward
        )

        with pytest.raises(ValidationError, match="higher role"):
            promotion.clean()
```

**Validation**:
- Run tests: `pytest tests/unit/apps/projects/test_model_validation.py -v`
- All tests should pass

---

### T006: Register Models in Django Admin

**Location**: `apps/projects/admin.py` (extend existing)

**Admin Classes**:
```python
from django.contrib import admin
from .models import ProjectMembership, ProjectInvite, ProjectMembershipPromotion


@admin.register(ProjectMembership)
class ProjectMembershipAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'project_name', 'role', 'assignment_reason', 'created_at', 'is_deleted')
    list_filter = ('role', 'assignment_reason', 'deleted_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'project__name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'deleted_at')
    date_hierarchy = 'created_at'

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    def project_name(self, obj):
        return obj.project.name
    project_name.short_description = 'Project'

    def is_deleted(self, obj):
        return obj.deleted_at is not None
    is_deleted.boolean = True
    is_deleted.short_description = 'Deleted'


@admin.register(ProjectInvite)
class ProjectInviteAdmin(admin.ModelAdmin):
    list_display = ('email', 'project_name', 'role', 'status', 'invited_by_email', 'created_at', 'expires_at')
    list_filter = ('status', 'role')
    search_fields = ('email', 'project__name', 'invited_by__email')
    readonly_fields = ('id', 'token', 'created_at', 'accepted_at')
    actions = ['resend_invitation', 'cancel_invitation']

    def project_name(self, obj):
        return obj.project.name
    project_name.short_description = 'Project'

    def invited_by_email(self, obj):
        return obj.invited_by.email if obj.invited_by else 'N/A'
    invited_by_email.short_description = 'Invited By'

    def resend_invitation(self, request, queryset):
        for invite in queryset.filter(status='pending'):
            invite.send_invitation_email()
        self.message_user(request, f"{queryset.count()} invitation(s) resent.")
    resend_invitation.short_description = "Resend selected invitations"

    def cancel_invitation(self, request, queryset):
        queryset.filter(status='pending').update(status='cancelled')
        self.message_user(request, f"{queryset.count()} invitation(s) cancelled.")
    cancel_invitation.short_description = "Cancel selected invitations"


@admin.register(ProjectMembershipPromotion)
class ProjectMembershipPromotionAdmin(admin.ModelAdmin):
    list_display = ('target_user_email', 'project_name', 'from_role', 'to_role', 'status', 'is_suspicious', 'created_at')
    list_filter = ('status', 'is_suspicious', 'to_role')
    search_fields = ('target_user__email', 'project__name')
    readonly_fields = ('id', 'suspicious_reason', 'created_at', 'resolved_at')

    def target_user_email(self, obj):
        return obj.target_user.email
    target_user_email.short_description = 'Target User'

    def project_name(self, obj):
        return obj.project.name
    project_name.short_description = 'Project'
```

**Validation**:
- Start Django server: `python manage.py runserver`
- Navigate to `/admin/projects/`
- Verify all 3 new models appear with correct list displays
- Test actions: Resend invitation, Cancel invitation
- Test filters: Role, Status, Suspicious flag

---

## Definition of Done

- [ ] All 4 models created with correct fields and constraints
- [ ] Migrations run successfully without errors
- [ ] All indexes created (verify with `\d+` in psql)
- [ ] Validation rules prevent invalid states (last admin, duplicates, downward promotions)
- [ ] Django Admin shows all models with correct filters and actions
- [ ] Test data can be seeded: `python manage.py seed_memberships --count=50`
- [ ] Unit tests pass: `pytest tests/unit/apps/projects/test_model_validation.py -v`

## Testing Guidance

**Unit Tests** (T005):
- Test validation logic in isolation
- Use pytest fixtures for test data
- Cover edge cases: last admin, duplicates, suspicious detection
- Target: 15 tests, 100% coverage on validation methods

**Manual Validation**:
```bash
# Run migrations
python manage.py migrate

# Verify models in Django shell
python manage.py shell
>>> from apps.projects.models import *
>>> ProjectMembership.objects.all()
>>> ProjectInvite.objects.all()
>>> ProjectMembershipPromotion.objects.all()

# Check indexes
psql -d django_core
\d+ project_memberships
\d+ project_invites
\d+ project_membership_promotions

# Seed test data
python manage.py seed_memberships --count=50

# Check Django Admin
# Visit http://localhost:8000/admin/projects/
```

## Risks & Mitigations

**Risk 1: Migration conflicts**
- **Mitigation**: Coordinate with team before applying migrations. Check for conflicting branches modifying `Project` model.

**Risk 2: Index performance on large datasets**
- **Mitigation**: Monitor query plans after seeding 10,000+ memberships. Add covering indexes if needed.

**Risk 3: Last admin protection edge cases**
- **Mitigation**: Comprehensive tests for simultaneous admin removal, auto-assign org admin fallback (per clarification).

## Reviewer Guidance

**Code Review Checklist**:
- [ ] All model fields have correct types and constraints
- [ ] Indexes cover common query patterns (project + user, status filters)
- [ ] Soft delete logic preserves audit history
- [ ] Validation errors have clear, user-friendly messages
- [ ] Django Admin provides useful filters and actions
- [ ] Migration files are backward compatible (no data loss)

**Performance Checks**:
- [ ] Query `\d+ project_memberships` → verify 3 indexes created
- [ ] Seed 1,000 memberships → verify list queries <100ms
- [ ] Check migration rollback works: `python manage.py migrate projects <previous_migration>`

**Security Checks**:
- [ ] Invitation tokens are cryptographically secure (32 bytes)
- [ ] No PII in model `__str__` methods (use email, not full name)
- [ ] Soft delete prevents data loss (important for GDPR compliance)

## Activity Log

- 2026-01-04T16:07:44Z – copilot – shell_pid= – lane=doing – Started implementation
