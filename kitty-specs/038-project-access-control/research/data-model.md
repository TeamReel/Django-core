# Data Model: Project-Level Access Control (B26)

**Feature ID**: 038-project-access-control
**Model Version**: 1.0
**Last Updated**: 2026-01-04

## Entity Relationship Diagram

```
┌─────────────┐         ┌────────────┐         ┌─────────────┐
│ Organisation│◄────────┤  Project   │◄────────┤    User     │
└─────────────┘         └────────────┘         └─────────────┘
                              │                       │
                              │                       │
                              ▼                       ▼
                        ┌──────────────────────────────┐
                        │   ProjectMembership          │
                        │  (explicit access)           │
                        └──────────────────────────────┘
                              │
                              │
                              ▼
                   ┌────────────────────────────┐
                   │ ProjectMembershipPromotion  │
                   │  (admin acceptance flow)    │
                   └────────────────────────────┘

                        ┌────────────┐
                        │  Project   │
                        └────────────┘
                              │
                              │
                              ▼
                        ┌─────────────┐
                        │ProjectInvite│
                        │(external)   │
                        └─────────────┘
```

## Core Entities

### Project (Extended)

**Purpose**: Container for resources within an organization. Extended with privacy flag for explicit-only membership.

**Schema**:
```python
class Project(BaseModel):
    """
    Extended with B26 private project flag.
    Existing fields: id, organisation, name, slug, created_at, etc.
    """
    # NEW FIELD
    is_private = models.BooleanField(
        default=False,
        help_text="When True, org admins do NOT have automatic access. "
                  "Only explicit ProjectMembership grants access."
    )

    class Meta:
        db_table = 'projects'
        indexes = [
            models.Index(fields=['organisation', 'is_private']),  # NEW INDEX
        ]
```

**Constraints**:
- When `is_private=True`: FR-002 enforced (no org-based auto-access)
- Transitioning `False → True`: Must warn about org members losing access (FR-033)

**Validation Rules**:
```python
def clean(self):
    if self.is_private and self.pk:  # Existing project
        # Count org members with auto-access who will lose it
        org_member_count = self.organisation.members.exclude(
            id__in=self.members.values_list('user_id', flat=True)
        ).count()

        if org_member_count > 0:
            # UI must show warning modal (FR-033)
            pass
```

**Audit Events**:
- `project.visibility_changed` (when `is_private` toggled)

---

### ProjectMembership (New)

**Purpose**: Explicit project access, overrides org-based defaults. Represents user-project-role relationship.

**Schema**:
```python
class ProjectMembership(BaseModel):
    """
    Explicit project membership with role assignment.
    Overrides organization-based access rules.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='project_memberships'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    role = models.CharField(
        max_length=20,
        choices=[
            ('viewer', 'Viewer'),   # Read-only access
            ('editor', 'Editor'),   # Read-write access
            ('admin', 'Admin'),     # Full management including members
        ],
        default='viewer'
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_memberships',
        help_text="User who added this member (null for system-created)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Soft delete for audit trail preservation
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_memberships'
    )

    # Emergency assignment tracking
    assignment_reason = models.CharField(
        max_length=50,
        choices=[
            ('invited', 'Invited'),
            ('added_by_admin', 'Added by Admin'),
            ('last_admin_fallback', 'Last Admin Fallback'),
            ('emergency_override', 'Emergency Override'),
        ],
        default='added_by_admin'
    )

    class Meta:
        db_table = 'project_memberships'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'project'],
                condition=Q(deleted_at__isnull=True),
                name='unique_active_membership_per_user_project'
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'deleted_at']),
            models.Index(fields=['project', 'role', 'deleted_at']),
            models.Index(fields=['created_by']),
        ]
```

**Validation Rules**:
```python
def clean(self):
    # FR-029: Cannot remove last admin
    if self.deleted_at and self.role == 'admin':
        active_admins = ProjectMembership.objects.filter(
            project=self.project,
            role='admin',
            deleted_at__isnull=True
        ).exclude(id=self.id).count()

        if active_admins == 0:
            raise ValidationError("Cannot remove the last admin from this project.")

    # Prevent duplicate active memberships
    if not self.deleted_at:
        existing = ProjectMembership.objects.filter(
            user=self.user,
            project=self.project,
            deleted_at__isnull=True
        ).exclude(id=self.id).exists()

        if existing:
            raise ValidationError("User already has active membership in this project.")
```

**State Transitions**:
```
                    ┌─────────────┐
                    │   Created   │
                    └─────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  Active (deleted_at=NULL) │◄──────┐
              └────────────────────────┘         │
                  │           │                   │
    ┌─────────────┤           └───────────────┐  │
    │ role_change │                           │  │ restore
    ▼             ▼                           ▼  │
┌────────┐   ┌────────┐   ┌────────┐   ┌──────────┐
│ Viewer │   │ Editor │   │ Admin  │   │ Deleted  │
└────────┘   └────────┘   └────────┘   └──────────┘
                               │
                               │ (admin only)
                               ▼
                      ┌──────────────────┐
                      │ Promotion Pending│
                      └──────────────────┘
```

**Audit Events**:
- `project.member.added` (on creation)
- `project.member.removed` (on soft delete)
- `project.member.role_changed` (on role update)

**Related Queries**:
```python
# Get user's role on project (FR-037 permission resolution)
membership = ProjectMembership.objects.filter(
    user=user,
    project=project,
    deleted_at__isnull=True
).first()

# Get all admins for last-admin protection
admins = ProjectMembership.objects.filter(
    project=project,
    role='admin',
    deleted_at__isnull=True
).select_related('user')

# Get member list with creator info (for UI)
members = ProjectMembership.objects.filter(
    project=project,
    deleted_at__isnull=True
).select_related('user', 'created_by').order_by('role', 'created_at')
```

---

### ProjectMembershipPromotion (New)

**Purpose**: Track pending admin promotions requiring explicit user acceptance (FR-020).

**Schema**:
```python
class ProjectMembershipPromotion(BaseModel):
    """
    Tracks admin role promotions requiring user acceptance.
    Editor → Admin transitions create pending promotion records.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    membership = models.ForeignKey(
        'projects.ProjectMembership',
        on_delete=models.CASCADE,
        related_name='promotions'
    )
    from_role = models.CharField(
        max_length=20,
        choices=[('viewer', 'Viewer'), ('editor', 'Editor')],
        help_text="Role at time of promotion initiation"
    )
    to_role = models.CharField(
        max_length=20,
        default='admin',
        help_text="Always 'admin' for B26 scope"
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('accepted', 'Accepted'),
            ('declined', 'Declined'),
            ('expired', 'Expired'),
            ('invalidated', 'Invalidated'),  # User removed before acceptance
        ],
        default='pending'
    )
    promoted_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='initiated_promotions',
        help_text="Admin who initiated the promotion"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        help_text="Auto-expires 7 days after creation"
    )

    class Meta:
        db_table = 'project_membership_promotions'
        indexes = [
            models.Index(fields=['membership', 'status']),
            models.Index(fields=['status', 'expires_at']),  # For expiration job
        ]
```

**Lifecycle**:
```
  ┌─────────┐
  │ Created │
  └─────────┘
       │
       ▼
  ┌─────────┐        accept()         ┌──────────┐
  │ Pending │─────────────────────────►│ Accepted │
  └─────────┘                          └──────────┘
       │                                     │
       │ decline()                           │ (membership.role → admin)
       ▼                                     ▼
  ┌──────────┐                          [END]
  │ Declined │
  └──────────┘
       │
       ▼
     [END]

  Background job (daily):
  IF expires_at < now AND status == 'pending':
      status = 'expired'
```

**Validation Rules**:
```python
def clean(self):
    # Promotion only valid if membership still exists and is active
    if self.membership.deleted_at:
        raise ValidationError("Cannot promote a removed member.")

    # User can only have one pending promotion per membership
    if self.status == 'pending':
        existing_pending = ProjectMembershipPromotion.objects.filter(
            membership=self.membership,
            status='pending'
        ).exclude(id=self.id).exists()

        if existing_pending:
            raise ValidationError("User already has a pending promotion.")

def accept(self):
    """FR-020: Accept admin promotion"""
    if self.status != 'pending':
        raise ValidationError("Can only accept pending promotions.")

    if timezone.now() > self.expires_at:
        self.status = 'expired'
        self.save()
        raise ValidationError("This promotion has expired.")

    # Update membership role
    self.membership.role = 'admin'
    self.membership.save()

    # Update promotion status
    self.status = 'accepted'
    self.responded_at = timezone.now()
    self.save()

    # Audit log
    audit_log("project.promotion.accepted", {
        "user": self.membership.user_id,
        "project": self.membership.project_id,
        "promoted_by": self.promoted_by_id,
    })

def decline(self):
    """Clarification 1: Decline cancels promotion, user remains at previous role"""
    if self.status != 'pending':
        raise ValidationError("Can only decline pending promotions.")

    self.status = 'declined'
    self.responded_at = timezone.now()
    self.save()

    # Notify initiating admin
    if self.promoted_by:
        notify_user(
            self.promoted_by,
            f"{self.membership.user.name} declined admin promotion on {self.membership.project.name}"
        )

    # Audit log
    audit_log("project.promotion.declined", {
        "user": self.membership.user_id,
        "project": self.membership.project_id,
        "declined_by": self.membership.user_id,
        "remains_at_role": self.from_role,
    })
```

**Audit Events**:
- `project.promotion.initiated` (on creation)
- `project.promotion.accepted` (on accept())
- `project.promotion.declined` (on decline())
- `project.promotion.expired` (background job)

---

### ProjectInvite (New)

**Purpose**: Email-based invitation for external collaborators (non-org members) to join projects (FR-008 through FR-015).

**Schema**:
```python
class ProjectInvite(BaseModel):
    """
    Email invitation for external users (not in organization).
    Token-based acceptance flow creates ProjectMembership on accept.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='invites'
    )
    email = models.EmailField(
        help_text="Email address of invitee (may not be a registered user yet)"
    )
    role = models.CharField(
        max_length=20,
        choices=[
            ('viewer', 'Viewer'),
            ('editor', 'Editor'),
            ('admin', 'Admin'),
        ],
        default='viewer'
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        help_text="Secure acceptance token (UUID4)"
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('accepted', 'Accepted'),
            ('cancelled', 'Cancelled'),
            ('expired', 'Expired'),
        ],
        default='pending'
    )
    invited_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_project_invites'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        help_text="7 days from creation (FR-015)"
    )
    last_sent_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp of last email send (for resend tracking)"
    )

    class Meta:
        db_table = 'project_invites'
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['email', 'project', 'status']),  # Prevent duplicate invites
            models.Index(fields=['token']),  # Fast token lookup
            models.Index(fields=['status', 'expires_at']),  # For expiration job
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['email', 'project'],
                condition=Q(status='pending'),
                name='unique_pending_invite_per_email_project'
            ),
        ]
```

**Validation Rules**:
```python
def clean(self):
    # FR-014: Prevent duplicate pending invites
    if self.status == 'pending':
        existing = ProjectInvite.objects.filter(
            email=self.email,
            project=self.project,
            status='pending'
        ).exclude(id=self.id).exists()

        if existing:
            raise ValidationError("User already has pending invite to this project.")

    # FR-028: Rate limiting (checked at view layer, not model)
    # Max 50 pending invites per project
    if self.status == 'pending':
        pending_count = ProjectInvite.objects.filter(
            project=self.project,
            status='pending'
        ).count()

        if pending_count >= 50:
            raise ValidationError("Project has reached maximum pending invites (50).")

def save(self, *args, **kwargs):
    if not self.expires_at:
        self.expires_at = timezone.now() + timedelta(days=7)
    super().save(*args, **kwargs)

def accept(self, accepting_user):
    """
    FR-010: Accept invite and create ProjectMembership
    """
    if self.status != 'pending':
        raise ValidationError("Can only accept pending invites.")

    if timezone.now() > self.expires_at:
        self.status = 'expired'
        self.save()
        raise ValidationError("This invite has expired.")

    # FR-011: Validate email match
    if accepting_user.email.lower() != self.email.lower():
        # Warning but allow (support intervention may be needed)
        logger.warning(f"Email mismatch: invite={self.email}, user={accepting_user.email}")

    # Create ProjectMembership
    membership = ProjectMembership.objects.create(
        user=accepting_user,
        project=self.project,
        role=self.role,
        created_by=self.invited_by,
        assignment_reason='invited'
    )

    # Update invite status
    self.status = 'accepted'
    self.accepted_at = timezone.now()
    self.save()

    # Audit log
    audit_log("project.invite.accepted", {
        "invitee": accepting_user.id,
        "project": self.project_id,
        "role": self.role,
        "invited_by": self.invited_by_id,
    })

    return membership

def resend(self):
    """
    FR-013: Resend invite email with fresh token
    """
    if self.status not in ['pending', 'expired']:
        raise ValidationError("Can only resend pending or expired invites.")

    # Refresh token and expiration
    self.token = uuid.uuid4()
    self.expires_at = timezone.now() + timedelta(days=7)
    self.status = 'pending'
    self.last_sent_at = timezone.now()
    self.save()

    # Send email (B16 integration)
    send_project_invite_email(self)

def cancel(self):
    """
    FR-013: Cancel invite and invalidate token
    """
    if self.status != 'pending':
        raise ValidationError("Can only cancel pending invites.")

    self.status = 'cancelled'
    self.save()

    # Audit log
    audit_log("project.invite.cancelled", {
        "email": self.email,
        "project": self.project_id,
        "cancelled_by": "admin",  # Passed from view
    })
```

**Lifecycle**:
```
  ┌─────────┐
  │ Created │
  └─────────┘
       │
       ▼
  ┌─────────┐        accept()         ┌──────────┐
  │ Pending │─────────────────────────►│ Accepted │ (creates ProjectMembership)
  └─────────┘                          └──────────┘
       │                                     │
       │ cancel()                            ▼
       ▼                                   [END]
  ┌───────────┐
  │ Cancelled │
  └───────────┘
       │
       ▼
     [END]

  Background job (daily):
  IF expires_at < now AND status == 'pending':
      status = 'expired'

  resend() → reset token, expires_at, status=pending
```

**Audit Events**:
- `project.invite.sent` (on creation + resend)
- `project.invite.accepted` (on accept())
- `project.invite.cancelled` (on cancel())
- `project.invite.expired` (background job)

---

## Supporting Queries

### Permission Resolution (FR-037)

```python
def get_project_role(user, project, request=None):
    """
    Hybrid permission resolution with caching.
    Returns: 'admin', 'editor', 'viewer', or None
    """
    cache_key = f"perm:{user.id}:{project.id}"

    # Request-scoped cache
    if request and hasattr(request, '_permission_cache'):
        if cache_key in request._permission_cache:
            return request._permission_cache[cache_key]

    # Redis cache
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Step 1: Explicit ProjectMembership
    try:
        membership = ProjectMembership.objects.get(
            user=user, project=project, deleted_at__isnull=True
        )
        role = membership.role
    except ProjectMembership.DoesNotExist:
        # Step 2: Private project check
        if project.is_private:
            role = None
        # Step 3: Org admin check
        elif user.is_org_admin(project.organisation):
            role = 'admin'
        # Step 4: Org member check
        elif user.is_org_member(project.organisation):
            role = 'viewer'
        # Step 5: No access
        else:
            role = None

    # Cache result
    cache.set(cache_key, role, 300)  # 5 min TTL
    if request:
        if not hasattr(request, '_permission_cache'):
            request._permission_cache = {}
        request._permission_cache[cache_key] = role

    return role
```

### User Search Privacy Filter (FR-005)

```python
def get_searchable_users(requesting_user, query):
    """
    Returns users matching query who are:
    1. In same organization, OR
    2. Share current/historical projects (feature flag)

    Limit: 10 results
    """
    org_members = User.objects.filter(
        organisationmembership__organisation=requesting_user.current_organisation,
        organisationmembership__deleted_at__isnull=True
    )

    # Shared project filter
    if get_feature_flag('search_include_historical_colleagues', default=False):
        # Historical: ANY ProjectMembership overlap
        shared_users = User.objects.filter(
            project_memberships__project__in=requesting_user.project_memberships.values('project')
        ).distinct()
    else:
        # Current: ACTIVE ProjectMembership overlap only
        shared_users = User.objects.filter(
            project_memberships__project__in=requesting_user.project_memberships.filter(
                deleted_at__isnull=True
            ).values('project'),
            project_memberships__deleted_at__isnull=True
        ).distinct()

    searchable = (org_members | shared_users).filter(
        Q(email__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query)
    ).distinct()[:10]

    return searchable
```

### Suspicious Promotion Detection (FR-030)

```python
def check_suspicious_promotion(membership):
    """
    Returns True if promotion to admin happens <24h after invite acceptance.
    """
    if membership.role != 'admin':
        return False

    # Check if user was recently invited (within 24 hours)
    recent_invite = ProjectInvite.objects.filter(
        project=membership.project,
        email=membership.user.email,
        status='accepted',
        accepted_at__gte=timezone.now() - timedelta(hours=24)
    ).exists()

    if recent_invite:
        # Audit log + alert (FR-032)
        audit_log("security.suspicious_promotion", {
            "user": membership.user_id,
            "project": membership.project_id,
            "hours_since_invite": (timezone.now() - recent_invite.accepted_at).total_seconds() / 3600,
        })

        # Send alert to org admins
        notify_org_admins(
            membership.project.organisation,
            f"Suspicious promotion: {membership.user.name} promoted to admin <24h after accepting invite"
        )

        return True

    return False
```

---

## Indexes & Performance

**Critical Indexes**:
```sql
-- ProjectMembership
CREATE INDEX idx_pm_user_deleted ON project_memberships(user_id, deleted_at);
CREATE INDEX idx_pm_project_role_deleted ON project_memberships(project_id, role, deleted_at);
CREATE UNIQUE INDEX idx_pm_unique_active ON project_memberships(user_id, project_id) WHERE deleted_at IS NULL;

-- ProjectInvite
CREATE INDEX idx_pi_project_status ON project_invites(project_id, status);
CREATE INDEX idx_pi_token ON project_invites(token);
CREATE INDEX idx_pi_email_project_status ON project_invites(email, project_id, status);
CREATE UNIQUE INDEX idx_pi_unique_pending ON project_invites(email, project_id) WHERE status = 'pending';

-- ProjectMembershipPromotion
CREATE INDEX idx_pmp_membership_status ON project_membership_promotions(membership_id, status);
CREATE INDEX idx_pmp_status_expires ON project_membership_promotions(status, expires_at);

-- Project
CREATE INDEX idx_project_org_private ON projects(organisation_id, is_private);
```

**Query Optimization**:
- Use `select_related('user', 'project', 'created_by')` for member lists
- Use `prefetch_related('memberships__user')` for projects with members
- Redis cache permission resolution (300s TTL)
- Request-scoped cache prevents duplicate permission checks within single request

---

## Migration Strategy

**Migration Order**:
1. Add `is_private` field to `Project` model (default=False, backward compatible)
2. Create `ProjectMembership` table
3. Create `ProjectInvite` table
4. Create `ProjectMembershipPromotion` table
5. Add indexes
6. Data migration: Backfill explicit ProjectMemberships for org admins on existing projects (optional)

**Rollback Plan**:
- Step 2-4 tables can be dropped without affecting existing project data
- Step 1 field removal requires data migration to preserve private project intent

---

## References

- Feature Spec: `kitty-specs/038-project-access-control/spec.md`
- Research: `kitty-specs/038-project-access-control/research/research.md`
- B08 RBAC: `src/apps/access_control/`
- B09 Audit: `src/apps/audit/`
