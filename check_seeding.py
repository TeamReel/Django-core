import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from permissions.models import Permission, Role

print(f"Permissions: {Permission.objects.count()}")
print(f"Roles: {Role.objects.count()}")
print(
    f"Global Admin has wildcard: {Role.objects.get(name='Global Admin').permissions.filter(permission='*').exists()}"
)
print(f"Sensitive permissions: {Permission.objects.filter(is_sensitive=True).count()}")

# List all permissions with sensitive flag
print("\nAll permissions:")
for perm in Permission.objects.all().order_by("permission"):
    marker = "[S]" if perm.is_sensitive else "[ ]"
    print(f"  {marker} {perm.permission} ({perm.resource_type})")

# List all roles with permission counts
print("\nAll roles:")
for role in Role.objects.all().order_by("name"):
    perm_count = role.permissions.count()
    perms = ", ".join([p.permission for p in role.permissions.all()[:3]])
    if perm_count > 3:
        perms += f", ... ({perm_count} total)"
    print(f"  - {role.name} ({role.scope}): {perms}")
