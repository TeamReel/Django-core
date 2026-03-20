# Generated migration to convert integer IDs to UUIDs
# Handles existing data before schema changes in 0004

from django.db import migrations


def clear_rtc_tables(apps, schema_editor):
    """
    Clear all rtc_websockets tables before schema change.
    Safe for demo/staging - no production data to preserve.
    WebSocket connections and activity events are ephemeral.
    """
    ActivityEvent = apps.get_model("rtc_websockets", "ActivityEvent")
    PresenceStatus = apps.get_model("rtc_websockets", "PresenceStatus")
    RealtimeMessage = apps.get_model("rtc_websockets", "RealtimeMessage")
    WebSocketConnection = apps.get_model("rtc_websockets", "WebSocketConnection")

    # Delete all records to allow schema migration
    # Note: We use raw SQL delete to avoid any model validation issues during migration
    # and to ensure we hit the correct table names even if models drift
    from django.db import connection

    with connection.cursor() as cursor:
        # Clear tables before schema change; handle missing tables gracefully
        for table in [
            "realtime_activity_event",
            "realtime_presence_status",
            "realtime_message",
            "realtime_websocket_connection",
        ]:
            try:
                cursor.execute(f"TRUNCATE TABLE {table} CASCADE")
            except Exception:
                try:
                    cursor.execute(f"DELETE FROM {table}")
                except Exception:
                    pass  # Table doesn't exist yet — safe to skip


def reverse_clear(apps, schema_editor):
    """Reverse migration - no-op since we can't restore deleted data."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("rtc_websockets", "0002_partial_indexes"),
    ]

    operations = [
        migrations.RunPython(clear_rtc_tables, reverse_clear),
    ]
