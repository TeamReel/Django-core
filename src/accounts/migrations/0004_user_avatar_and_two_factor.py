from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_user_active_context"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.ImageField(blank=True, null=True, upload_to="avatars/"),
        ),
        migrations.AddField(
            model_name="user",
            name="two_factor_enabled",
            field=models.BooleanField(default=False),
        ),
    ]
