import os
import sys
import django

sys.path.insert(0, "src")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()

from projects.models import ProjectMembership, Project
from activities.models import Period, Activity
from organisations.models import Organisation

lines = ["# Current Database State", ""]

for org in Organisation.objects.all():
    lines.append(f"## Organisation: {org.name}")

    # Root Projects (Clubs)
    clubs = Project.objects.filter(organisation=org, parent_project__isnull=True)
    for club in clubs:
        lines.append(f"- **Club**: {club.name}")

        # Child Projects (Teams)
        teams = Project.objects.filter(parent_project=club)
        for team in teams:
            lines.append(f"  - **Team**: {team.name}")

            # Check periods on team (Root periods for this project)
            periods = Period.objects.filter(project=team, parent_period__isnull=True)
            for p in periods:
                lines.append(f"    - Period (Root): {p.name}")

                # Children periods
                children = Period.objects.filter(parent_period=p)
                for child in children:
                    lines.append(f"      - Sub-Period: {child.name} (Metadata: {child.metadata})")

                    # Activities
                    activities = Activity.objects.filter(period=child).count()
                    if activities > 0:
                        lines.append(f"        - Activities: {activities}")

            # Check direct memberships
            members = ProjectMembership.objects.filter(project=team).count()
            lines.append(f"    - Members: {members}")
    lines.append("")

print("\n".join(lines))
