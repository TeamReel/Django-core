import os
import sys
import django

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from transactions.models import Transaction
from organisations.models import Organisation


def check_transactions():
    org_id = "40f921da-ee87-4984-beb0-39e40b5ed807"
    try:
        org = Organisation.objects.get(id=org_id)
        print(f"Checking transactions for org: {org.name} ({org.id})")
    except Organisation.DoesNotExist:
        print(f"Org {org_id} not found")
        return

    transactions = Transaction.objects.filter(organization=org)
    print(f"Total transactions found: {transactions.count()}")

    for t in transactions:
        print(f"- ID: {t.id}")
        print(f"  Amount: {t.amount}")
        print(f"  Source Type: {t.source_type}")
        print(f"  Project: {t.project}")
        print(f"  Timestamp: {t.timestamp}")
        print("---")


if __name__ == "__main__":
    check_transactions()
