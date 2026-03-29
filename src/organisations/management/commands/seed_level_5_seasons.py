"""
TeamReel Level 5: Seed Seasons (Root Periods)

Creates 50 seasons (10 per federation) spanning 2015-2025:
- 🇳🇱 KNVB: Season 2015/2016 - Season 2024/2025 (10)
- 🇩🇪 DFB: Season 2015/16 - Season 2024/25 (10)
- 🇧🇪 RBFA: Season 2015-16 - Season 2024-25 (10)
- 🏴 The FA: Season 2015/16 - Season 2024/25 (10)
- 🇮🇹 FIGC: Season 2015/16 - Season 2024/25 (10)

Each season:
- parent_period = NULL (root level)
- start_date: 1 August (year 1)
- end_date: 31 May (year 2)
- organisation FK to federation
"""

from datetime import date

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation


class Command(BaseCommand):
    help = "TeamReel Level 5: Seed 50 seasons (10 per federation)"

    def handle(self, *args, **options):
        self.stdout.write("⚽ Level 5: Seasons (Root Periods)\n")
        self.stdout.write("=" * 70)

        admin_user = User.objects.filter(email="admin@teamreel.demo").first()
        if not admin_user:
            self.stderr.write("❌ Admin user not found. Run seed_level_1_admin_user first.")
            return

        federations = {
            "KNVB": Organisation.objects.filter(name="KNVB").first(),
            "DFB": Organisation.objects.filter(name="DFB").first(),
            "RBFA": Organisation.objects.filter(name="RBFA").first(),
            "The FA": Organisation.objects.filter(name="The FA").first(),
            "FIGC": Organisation.objects.filter(name="FIGC").first(),
        }

        missing = [name for name, org in federations.items() if org is None]
        if missing:
            self.stderr.write(f"❌ Missing federations: {', '.join(missing)}")
            return

        created_count = 0
        existing_count = 0

        # Season years: 2015/2016 through 2024/2025 (10 seasons)
        season_years = [
            (2015, 2016),
            (2016, 2017),
            (2017, 2018),
            (2018, 2019),
            (2019, 2020),
            (2020, 2021),
            (2021, 2022),
            (2022, 2023),
            (2023, 2024),
            (2024, 2025),
        ]

        with transaction.atomic():
            for fed_name, org in federations.items():
                self.stdout.write(f"\n{fed_name}")
                self.stdout.write("-" * 70)

                for year1, year2 in season_years:
                    # Format season name (federation-specific)
                    if fed_name == "KNVB":
                        season_name = f"Season {year1}/{year2}"
                    else:
                        season_name = f"Season {year1}/{str(year2)[-2:]}"

                    start_date = date(year1, 8, 1)  # 1 August
                    end_date = date(year2, 5, 31)  # 31 May

                    period, created = Period.objects.get_or_create(
                        organisation=org,
                        name=season_name,
                        start_date=start_date,
                        defaults={
                            "end_date": end_date,
                            "parent_period": None,
                            "project": None,
                            "description": f"{fed_name} football season {year1}/{year2}",
                            "created_by": admin_user,
                            "metadata": {
                                "season_type": "root",
                                "year_start": year1,
                                "year_end": year2,
                            },
                        },
                    )

                    if created:
                        created_count += 1
                        self.stdout.write(f"  ✓ {season_name}")
                    else:
                        existing_count += 1

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("✅ Level 5 Complete")
        self.stdout.write(f"   Created:  {created_count}")
        self.stdout.write(f"   Existing: {existing_count}")
        self.stdout.write(f"   Total:    {created_count + existing_count} seasons")
        self.stdout.write("=" * 70)
        self.stdout.write("\n📊 DISTRIBUTION:")
        self.stdout.write("   Each federation: 10 seasons (2015-2025)")
        self.stdout.write("=" * 70)
