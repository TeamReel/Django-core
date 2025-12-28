import os
import sys
import django

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from organisations.models import Organisation
from credits.models import CreditsBalance

org_names = ["Bundesliga", "Premier League", "Eredivisie", "La Liga", "Serie A"]

print("Checking credits for organisations:")
for name in org_names:
    try:
        org = Organisation.objects.filter(name=name).first()
        if org:
            balance = CreditsBalance.objects.filter(organisation=org).first()
            print(f"{name}: {balance.current_balance if balance else 'None'}")
        else:
            print(f"{name}: Not Found")
    except Exception as e:
        print(f"{name}: Error {e}")
