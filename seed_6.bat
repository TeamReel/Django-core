@echo off
set DATABASE_URL=postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway
set DJANGO_SETTINGS_MODULE=config.settings.production
python manage.py seed_level_6_competitions
