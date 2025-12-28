# Generated migration for CreditsBalance model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("organisations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CreditsBalance",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "current_balance",
                    models.IntegerField(
                        default=0, help_text="Current credit balance for this organisation"
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, help_text="Last time balance was updated"),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True, help_text="When this balance record was created"
                    ),
                ),
                (
                    "organisation",
                    models.OneToOneField(
                        help_text="Organisation this balance belongs to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="credits_balance",
                        to="organisations.organisation",
                    ),
                ),
            ],
            options={
                "verbose_name": "Credits Balance",
                "verbose_name_plural": "Credits Balances",
                "ordering": ["-updated_at"],
            },
        ),
    ]
