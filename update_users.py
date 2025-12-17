from accounts.models import User

emails = [
    "admin@example.com",
    "alice@example.com",
    "bob@example.com",
    "carol@example.com",
    "dave@example.com",
]
count = User.objects.filter(email__in=emails).update(email_verified=True, is_active=True)
print(f"Updated {count} users to email_verified=True and is_active=True")
