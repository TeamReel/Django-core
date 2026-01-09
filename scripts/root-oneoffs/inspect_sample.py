import os, sys, django

sys.path.insert(0, "src")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from organisations.models import Organisation
from projects.models import Project, ProjectMembership
from activities.models import Period, Activity

print("\n=== DB STATE (Sample: First 20 Teams) ===\n")
print(
    f"{'ORG':<8} | {'CLUB':<20} | {'TEAM':<30} | {'SEASON':<20} | {'COMP':<20} | {'PLY':<4} | {'MCH':<4}"
)
print("-" * 120)

count = 0
for org in Organisation.objects.all():
    for club in Project.objects.filter(organisation=org, parent_project__isnull=True)[
        :5
    ]:  # Max 5 clubs per org
        for team in Project.objects.filter(parent_project=club)[:2]:  # Max 2 teams per club
            for season in Period.objects.filter(project=team, parent_period__isnull=True)[
                :2
            ]:  # Max 2 seasons per team
                members = ProjectMembership.objects.filter(project=team, period=season).count()
                for comp in Period.objects.filter(parent_period=season)[:1]:  # 1 comp per season
                    matches = Activity.objects.filter(project=team, period=comp).count()
                    print(
                        f"{org.slug:<8} | {club.name[:20]:<20} | {team.name[:30]:<30} | {season.name[:20]:<20} | {comp.name[:20]:<20} | {members:<4} | {matches:<4}"
                    )
                    count += 1
                    if count >= 20:
                        break
                if count >= 20:
                    break
            if count >= 20:
                break
        if count >= 20:
            break
    if count >= 20:
        break

print("\n(Showing sample only for speed)\n")
