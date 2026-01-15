# Generated manually on 2026-01-14

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def forwards_set_wallet_scope(apps, schema_editor):
    Transaction = apps.get_model("transactions", "Transaction")

    # Default is organization; fix existing rows based on current fields.
    Transaction.objects.filter(charged_user__isnull=False).update(wallet_scope="user")
    Transaction.objects.filter(charged_user__isnull=True, project__isnull=False).update(
        wallet_scope="project"
    )
    Transaction.objects.filter(charged_user__isnull=True, project__isnull=True).update(
        wallet_scope="organization"
    )


def backwards_unset_wallet_scope(apps, schema_editor):
    Transaction = apps.get_model("transactions", "Transaction")
    Transaction.objects.update(wallet_scope="organization")


class Migration(migrations.Migration):
    dependencies = [
        ("transactions", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="transaction",
            name="wallet_scope",
            field=models.CharField(
                choices=[
                    ("organization", "Organization"),
                    ("project", "Project"),
                    ("user", "User"),
                ],
                db_index=True,
                default="organization",
                help_text="Which wallet balance this transaction affects",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="charged_user",
            field=models.ForeignKey(
                blank=True,
                help_text="If wallet_scope=user, the user whose balance is charged/credited",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="charged_transactions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(forwards_set_wallet_scope, backwards_unset_wallet_scope),
    ]
