"""
API endpoint to trigger cache metrics seeding (superadmin only).
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.core.management import call_command
from io import StringIO


@api_view(["POST"])
@permission_classes([IsAdminUser])
def seed_metrics(request):
    """
    Trigger cache metrics seeding.

    **Security**: Only accessible by superadmin users.

    **POST /api/v1/system/seed-cache-metrics/**

    Query Parameters:
    - days (int): Number of days to seed (default: 7)
    - interval (int): Interval in minutes (default: 10)

    Returns:
    - 200: Seeding completed successfully
    - 400: Invalid parameters
    - 403: Forbidden (not superadmin)
    - 500: Seeding failed
    """
    try:
        # Get parameters
        days = int(request.query_params.get("days", 7))
        interval = int(request.query_params.get("interval", 10))

        # Validate parameters
        if days < 1 or days > 30:
            return Response(
                {"error": "days must be between 1 and 30"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if interval < 1 or interval > 60:
            return Response(
                {"error": "interval must be between 1 and 60 minutes"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Capture command output
        output = StringIO()
        call_command(
            "seed_cache_metrics",
            days=days,
            interval=interval,
            stdout=output,
            stderr=output,
        )

        output_text = output.getvalue()

        return Response(
            {
                "status": "success",
                "message": "Cache metrics seeded successfully",
                "output": output_text,
                "parameters": {"days": days, "interval": interval},
            }
        )

    except Exception as e:
        return Response(
            {"error": f"Seeding failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
