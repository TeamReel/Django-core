"""
TeamReel Level 2 Seeder: Organisations (Federaties)

Seeds 5 European football federations as root organisations.

Usage:
    # Production (Railway):
    $env:DATABASE_URL="postgresql://..."; python manage.py seed_level_2_organisations
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from organisations.models import Organisation

User = get_user_model()


class Command(BaseCommand):
    help = "Seed Level 2: Football Federations (5 European organisations)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n🏛️  Level 2: Organisations\n"))
        self.stdout.write("=" * 70)

        # Get admin user (should exist from Level 1)
        try:
            admin = User.objects.get(email="admin@teamreel.demo")
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR("❌ Admin user not found. Run seed_level_1_users first!")
            )
            return

        federations_data = [
            {
                "name": "KNVB",
                "description": "Koninklijke Nederlandse Voetbal Bond",
                "country": "Netherlands",
                "website": "https://www.knvb.nl",
                "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/KNVB_Logo.svg/200px-KNVB_Logo.svg.png",
            },
            {
                "name": "DFB",
                "description": "Deutscher Fußball-Bund",
                "country": "Germany",
                "website": "https://www.dfb.de",
                "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/DFB-Logo.svg/200px-DFB-Logo.svg.png",
            },
            {
                "name": "RBFA",
                "description": (
                    "Koninklijke Belgische Voetbalbond"
                    " / Union Royale Belge des"
                    " Sociétés de Football"
                ),
                "country": "Belgium",
                "website": "https://www.rbfa.be",
                "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/3/32/Royal_Belgian_FA_logo.svg/200px-Royal_Belgian_FA_logo.svg.png",
            },
            {
                "name": "The FA",
                "description": "The Football Association",
                "country": "England",
                "website": "https://www.thefa.com",
                "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/FA_Logo.svg/200px-FA_Logo.svg.png",
            },
            {
                "name": "FIGC",
                "description": "Federazione Italiana Giuoco Calcio",
                "country": "Italy",
                "website": "https://www.figc.it",
                "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/Italian_Football_Federation_logo.svg/200px-Italian_Football_Federation_logo.svg.png",
            },
        ]

        created_count = 0
        existing_count = 0

        for fed_data in federations_data:
            org, created = Organisation.objects.get_or_create(
                name=fed_data["name"],
                defaults={
                    "description": fed_data["description"],
                    "creator": admin,
                    "metadata": {
                        "country": fed_data["country"],
                        "type": "federation",
                        "sport": "football",
                        "website": fed_data["website"],
                        "logo_url": fed_data["logo"],
                    },
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  ✓ Created: {org.name} ({fed_data['country']})")
            else:
                existing_count += 1
                self.stdout.write(f"  ↻ Exists: {org.name} ({fed_data['country']})")

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Level 2 Complete"))
        self.stdout.write(f"   Created:  {created_count}")
        self.stdout.write(f"   Existing: {existing_count}")
        self.stdout.write(f"   Total:    {created_count + existing_count} federations")
        self.stdout.write("=" * 70 + "\n")
