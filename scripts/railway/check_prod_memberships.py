from organisations.models import Membership

print("User | Organisation | Role")
print("--- | --- | ---")
for m in (
    Membership.objects.select_related("user", "organisation").all().order_by("organisation__name")
):
    print(f"{m.user.email} | {m.organisation.name} | {m.role}")
