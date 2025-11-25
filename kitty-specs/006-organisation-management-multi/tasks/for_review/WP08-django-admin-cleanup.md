---
work_package_id: WP08
title: Django Admin & Cleanup Management
lane: "for_review"
subtasks: [T046, T047, T048, T049, T050, T051]
priority: Medium
user_story: None (operational)
agent: "claude"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP08: Django Admin & Cleanup Management

## Objective

Configure Django admin for superadmin management and implement automated cleanup of soft-deleted organisations after 30 days.

## Key Implementation Points

### T046-T048: Django Admin Configuration
- In `organisations/admin.py`:
  ```python
  from django.contrib import admin
  from .models import Organisation, Membership

  @admin.register(Organisation)
  class OrganisationAdmin(admin.ModelAdmin):
      list_display = ['name', 'slug', 'creator', 'is_active', 'created_at', 'deleted_at']
      list_filter = ['is_active', 'created_at']
      search_fields = ['name', 'slug']
      readonly_fields = ['id', 'slug', 'created_at', 'updated_at']
      actions = ['restore_organisations']

      def restore_organisations(self, request, queryset):
          count = 0
          for org in queryset.filter(is_active=False):
              org.is_active = True
              org.deleted_at = None
              org.save()
              org.memberships.update(is_active=True)
              count += 1
          self.message_user(request, f"Restored {count} organisations")
      restore_organisations.short_description = "Restore soft-deleted organisations"

  @admin.register(Membership)
  class MembershipAdmin(admin.ModelAdmin):
      list_display = ['user', 'organisation', 'role', 'is_active', 'joined_at']
      list_filter = ['role', 'is_active', 'joined_at']
      search_fields = ['user__username', 'organisation__name']
  ```

### T049-T051: Cleanup Management Command
- Create `src/organisations/management/commands/cleanup_deleted_organisations.py`:
  ```python
  from django.core.management.base import BaseCommand
  from django.utils import timezone
  from datetime import timedelta
  from organisations.models import Organisation

  class Command(BaseCommand):
      help = 'Hard-delete soft-deleted organisations past retention period'

      def add_arguments(self, parser):
          parser.add_argument('--days', type=int, default=30,
                            help='Retention period in days (default: 30)')
          parser.add_argument('--dry-run', action='store_true',
                            help='Show what would be deleted without deleting')

      def handle(self, *args, **options):
          days = options['days']
          dry_run = options['dry_run']

          threshold = timezone.now() - timedelta(days=days)
          orgs = Organisation.objects.filter(
              is_active=False,
              deleted_at__lt=threshold
          )

          count = orgs.count()

          if dry_run:
              self.stdout.write(f"Would delete {count} organisations")
              for org in orgs:
                  self.stdout.write(f"  - {org.name} (deleted {org.deleted_at})")
          else:
              for org in orgs:
                  self.stdout.write(f"Deleting {org.name}")
                  org.hard_delete()

              self.stdout.write(self.style.SUCCESS(
                  f"Deleted {count} organisations past {days}-day retention"
              ))
  ```

## Definition of Done

- [ ] Organisations and Memberships appear in Django admin
- [ ] Admin list shows is_active, deleted_at status
- [ ] Custom admin action restores soft-deleted orgs
- [ ] Management command exists and is runnable
- [ ] --dry-run flag prevents actual deletion
- [ ] --days flag configurable
- [ ] Cleanup logs operations

## Testing

```bash
# Dry run
python manage.py cleanup_deleted_organisations --dry-run

# Actual cleanup with 7-day retention (testing)
python manage.py cleanup_deleted_organisations --days=7

# Set up cron job or scheduled task:
# Daily at 2 AM: 0 2 * * * cd /app && python manage.py cleanup_deleted_organisations
```

## Dependencies

- WP02 (models exist)

## Related Docs

- Spec: FR-023 (30-day retention)
- Research: Q4 (soft-delete strategy)

## Activity Log

- 2025-11-25T09:43:13Z – claude – shell_pid= – lane=doing – Started implementation
- 2025-11-25T09:45:44Z – claude – shell_pid= – lane=for_review – Implementation complete: Added Django admin with restore action and cleanup command with --dry-run and --days flags
