@echo off
set DATABASE_URL=postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway
set DJANGO_SETTINGS_MODULE=config.settings.production
python check_hierarchy.py
