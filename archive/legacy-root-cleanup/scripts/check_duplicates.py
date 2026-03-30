from django.db.models import Count
from accounts.models import User

# Check for duplicate emails
print('--- Duplicate Emails ---')
dup_emails = User.objects.values('email').annotate(count=Count('id')).filter(count__gt=1)
if dup_emails.exists():
    for entry in dup_emails:
        print(f'{entry["email"]}: {entry["count"]} times')
else:
    print('No duplicate emails found.')

# Check for duplicate names
print('\n--- Duplicate Names (First + Last) ---')
dup_names = User.objects.values('first_name', 'last_name').annotate(count=Count('id')).filter(count__gt=1).order_by('-count')
total_dup_groups = dup_names.count()

print(f'Found {total_dup_groups} name combinations that appear more than once.')
print('Top 10 duplicates:')
for entry in dup_names[:10]:
    print(f'{entry["first_name"]} {entry["last_name"]}: {entry["count"]} times')

# Example detail for one of them if exists
if dup_names.exists():
    first = dup_names.first()
    f, l = first['first_name'], first['last_name']
    users = User.objects.filter(first_name=f, last_name=l)[:3]
    print(f'\nSample details for {f} {l}:')
    for u in users:
        print(f' - ID: {u.id}, Email: {u.email}')
