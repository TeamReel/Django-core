# Generated manually on 2026-01-14

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("credits", "0003_alter_projectcreditsbalance_current_balance"),
        ("organisations", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserCreditsBalance",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "current_balance",
                    models.DecimalField(
                        decimal_places=4,
                        default=0,
                        help_text="Current credit balance for this user within this organisation",
                        max_digits=14,
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        auto_now=True,
                        help_text="Last time balance was updated",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        help_text="When this balance record was created",
                    ),
                ),
                (
                    "organisation",
                    models.ForeignKey(
                        help_text="Organisation this user wallet belongs to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_credits_balances",
                        to="organisations.organisation",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        help_text="User this wallet belongs to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="credits_balances",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "User Credits Balance",
                "verbose_name_plural": "User Credits Balances",
                "ordering": ["-updated_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="usercreditsbalance",
            constraint=models.UniqueConstraint(
                fields=("organisation", "user"),
                name="unique_org_user_credits_balance",
            ),
        ),
        migrations.AddIndex(
            model_name="usercreditsbalance",
            index=models.Index(
                fields=["organisation", "updated_at"], name="credits_use_org_1f4bc8_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="usercreditsbalance",
            index=models.Index(fields=["user", "updated_at"], name="credits_use_use_5f5a61_idx"),
        ),
    ]
