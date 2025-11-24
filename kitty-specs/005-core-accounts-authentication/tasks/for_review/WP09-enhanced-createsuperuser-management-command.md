---
work_package_id: "WP09"
subtasks: ["T073", "T074", "T075", "T076", "T077", "T078"]
title: "Enhanced createsuperuser Management Command"
phase: "Phase 2 - Admin & Roles"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: "11524"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-23T22:25:59Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-11-24T20:30:41+01:00"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Started implementation of enhanced createsuperuser command"
  - timestamp: "2025-11-24T20:35:08+01:00"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11524"
    action: "Completed implementation - command functional with validation"
---

# Work Package Prompt: WP09 – Enhanced createsuperuser Management Command

## Objectives

**Goal**: Create Django management command for initial superadmin creation with email verification bypass and proper role assignment.

**Success Criteria**:
- [ ] Command creates superuser with is_superuser=True, is_staff=True
- [ ] Email verification bypassed (email_verified=True, is_active=True)
- [ ] Assigned to 'superadmin' group automatically
- [ ] Interactive and non-interactive modes supported
- [ ] Validates email uniqueness and password strength

## Key Implementation Points

### T073-T077 – Create Management Command

Create `src/accounts/management/commands/createsuperuser.py`:
```python
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from accounts.models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
import getpass

class Command(BaseCommand):
    help = 'Create a superuser account'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Superuser email address')
        parser.add_argument('--no-input', action='store_true', help='Non-interactive mode')

    def handle(self, *args, **options):
        email = options.get('email')
        no_input = options.get('no_input')

        if no_input and not email:
            self.stderr.write('--email required in non-interactive mode')
            return

        # Get email
        while not email:
            email = input('Email address: ').strip()
            if not email:
                self.stderr.write('Email is required')
                continue
            try:
                validate_email(email)
            except ValidationError:
                self.stderr.write('Invalid email format')
                email = None
                continue

            # Check uniqueness
            if User.objects.filter(email=email).exists():
                self.stderr.write(f'User with email {email} already exists')
                email = None

        # Get password
        if no_input:
            self.stderr.write('Cannot create superuser in non-interactive mode without password')
            return

        password = None
        while not password:
            password = getpass.getpass('Password: ')
            password_confirm = getpass.getpass('Password (again): ')

            if password != password_confirm:
                self.stderr.write('Passwords do not match')
                password = None
                continue

            try:
                validate_password(password)
            except ValidationError as e:
                for error in e.messages:
                    self.stderr.write(error)
                password = None

        # Create superuser
        user = User.objects.create_superuser(
            email=email,
            password=password
        )

        # Assign to superadmin group
        try:
            superadmin_group = Group.objects.get(name='superadmin')
            user.groups.add(superadmin_group)
        except Group.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                'Warning: superadmin group does not exist. Run migrations first.'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'Superuser created successfully: {email}'
        ))
```

Ensure directory exists: `src/accounts/management/commands/__init__.py`

---

### T078 – Documentation

Update `src/accounts/README.md`:
```markdown
## Creating Initial Superuser

### Interactive Mode
```bash
python manage.py createsuperuser
# Enter email and password when prompted
```

### Non-Interactive Mode
```bash
python manage.py createsuperuser --email admin@example.com --no-input
# Password must be set interactively for security
```

### Superuser Properties
- is_superuser=True (all permissions)
- is_staff=True (Django Admin access)
- is_active=True (can login immediately)
- email_verified=True (bypass verification)
- Assigned to 'superadmin' group
```

Update `kitty-specs/005-core-accounts-authentication/quickstart.md` with command usage.

---

## Definition of Done

- [ ] Command creates superuser correctly
- [ ] Email and password validated
- [ ] Email verification bypassed
- [ ] Assigned to superadmin group
- [ ] Interactive mode works
- [ ] Non-interactive mode validated
- [ ] Documentation complete

**Dependencies**: WP01, WP02 (User model, groups)
**Estimated Effort**: 2-3 hours
