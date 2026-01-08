import os
import subprocess

os.environ["DATABASE_URL"] = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"

result = subprocess.run(["python", "manage.py", "seed_level_6_competitions"], capture_output=False)
exit(result.returncode)
