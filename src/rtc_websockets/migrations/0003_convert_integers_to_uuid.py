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
        # Use TRUNCATE CASCADE to ensure everything is gone and fast
        # Fallback to DELETE if TRUNCATE fails (e.g. permissions)
        try:
            cursor.execute("TRUNCATE TABLE realtime_activity_event CASCADE")
            cursor.execute("TRUNCATE TABLE realtime_presence_status CASCADE")
            cursor.execute("TRUNCATE TABLE realtime_message CASCADE")
            cursor.execute("TRUNCATE TABLE realtime_websocket_connection CASCADE")
        except Exception:
            cursor.execute("DELETE FROM realtime_activity_event")
            cursor.execute("DELETE FROM realtime_presence_status")
            cursor.execute("DELETE FROM realtime_message")
            cursor.execute("DELETE FROM realtime_websocket_connection")


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
