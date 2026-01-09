from activities.models import Activity, Period
from projects.models import Project
from organisations.models import Organisation

knvb = Organisation.objects.get(slug="knvb")
ajax = Project.objects.get(organisation=knvb, name="Ajax", parent_project__isnull=True)
ajax1 = Project.objects.get(organisation=knvb, name="Ajax 1", parent_project=ajax)
league_comp = Period.objects.get(
    project=ajax1, name="League", parent_period__name="Season 2024/2025"
)

matches = Activity.objects.filter(project=ajax1, period=league_comp)[:3]
print(f"Ajax 1 League matches: {matches.count()} total\n")
print("First 3 matches:")
for m in matches:
    print(f"  {m.name}")
    print(f"  Date: {m.start_time.date()} {m.start_time.time()}")
    print(f"  Location: {m.location}")
    print(f"  Metadata: {m.metadata}\n")
