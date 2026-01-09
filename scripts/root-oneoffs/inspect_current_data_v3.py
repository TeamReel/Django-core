import os
import sys
import django

sys.path.insert(0, "src")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()

from projects.models import ProjectMembership, Project
from activities.models import Period
from organisations.models import Organisation

output_file = "documents/05-demo/CURRENT_DB_STATE.md"

with open(output_file, "w", encoding="utf-8") as f:
    f.write("# Current Database State\n\n")

    for org in Organisation.objects.all():
        f.write(f"## Organisation: {org.name}\n")

        # Root Projects (Clubs)
        clubs = Project.objects.filter(organisation=org, parent_project__isnull=True)
        for club in clubs:
            f.write(f"- **Club**: {club.name}\n")

            teams = Project.objects.filter(parent_project=club)
            for team in teams:
                f.write(f"  - **Team**: {team.name}\n")

                # Check periods on team (Root periods for this project)
                periods = Period.objects.filter(project=team, parent_period__isnull=True)
                for p in periods:
                    f.write(f"    - Period (Root): {p.name} (Metadata: {p.metadata})\n")

                    children = Period.objects.filter(parent_period=p)
                    for child in children:
                        f.write(f"      - Sub-Period: {child.name} (Metadata: {child.metadata})\n")

                members = ProjectMembership.objects.filter(project=team).count()
                f.write(f"    - Members: {members}\n")
        f.write("\n")

print(f"Report written to {output_file}")
