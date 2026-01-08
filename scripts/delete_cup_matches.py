from django.db import connection

cursor = connection.cursor()
cursor.execute(
    """
    DELETE FROM activities_activity
    WHERE activity_type = 'match'
    AND period_id IN (
        SELECT id FROM activities_period WHERE name = 'Cup'
    )
"""
)
deleted = cursor.rowcount
print(f"Deleted {deleted} cup matches")
