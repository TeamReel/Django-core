"""
API endpoint to trigger cache metrics seeding (superadmin only).
"""

from io import StringIO

from django.core.management import call_command
from django.http import HttpResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
@ensure_csrf_cookie
def seed_metrics(request):
    """
    Trigger cache metrics seeding.

    **Security**: Only accessible by superadmin users.

    **GET /api/v1/system/seed-cache-metrics/** - Show HTML form
    **POST /api/v1/system/seed-cache-metrics/** - Execute seeding

    Query Parameters:
    - days (int): Number of days to seed (default: 7)
    - interval (int): Interval in minutes (default: 10)

    Returns:
    - 200: Seeding completed successfully
    - 400: Invalid parameters
    - 403: Forbidden (not superadmin)
    - 500: Seeding failed
    """
    # Handle GET request - show HTML form
    if request.method == "GET":
        csrf_token = get_token(request)
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Seed Cache Metrics</title>
            <style>
                body {{
                    font-family: system-ui, -apple-system, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                }}
                h1 {{ color: #2563eb; }}
                form {{ background: #f9fafb; padding: 20px;
                    border-radius: 8px; }}
                label {{ display: block; margin: 15px 0 5px; font-weight: 600; }}
                input {{
                    width: 100%; padding: 8px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                }}
                button {{
                    background: #2563eb; color: white;
                    padding: 10px 20px; border: none;
                    border-radius: 4px; cursor: pointer;
                    margin-top: 15px;
                }}
                button:hover {{ background: #1d4ed8; }}
                .info {{
                    background: #dbeafe; padding: 15px;
                    border-radius: 4px; margin: 20px 0;
                }}
                pre {{
                    background: #1f2937; color: #10b981;
                    padding: 15px; border-radius: 4px;
                    overflow-x: auto;
                }}
            </style>
        </head>
        <body>
            <h1>🌱 Seed Cache Metrics</h1>
            <div class="info">
                <strong>Purpose:</strong> Generate 7 days of historical
                cache performance data for the demo dashboard.
            </div>

            <form method="POST" id="seedForm">
                <input type="hidden" name="csrfmiddlewaretoken" value="{csrf_token}">
                <label>Days of History (1-30):</label>
                <input type="number" name="days" value="7" min="1" max="30" required>

                <label>Interval (minutes, 1-60):</label>
                <input type="number" name="interval" value="10" min="1" max="60" required>

                <button type="submit">🚀 Run Seeder</button>
            </form>

            <div id="result" style="display: none;">
                <h2>Result:</h2>
                <pre id="output"></pre>
            </div>

            <script>
                function getCookie(name) {{
                    let cookieValue = null;
                    if (document.cookie && document.cookie !== '') {{
                        const cookies = document.cookie.split(';');
                        for (let i = 0; i < cookies.length; i++) {{
                            const cookie = cookies[i].trim();
                            if (cookie.substring(0, name.length + 1) === (name + '=')) {{
                                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                                break;
                            }}
                        }}
                    }}
                    return cookieValue;
                }}

                document.getElementById('seedForm').addEventListener('submit', async (e) => {{
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const days = formData.get('days');
                    const interval = formData.get('interval');

                    document.getElementById('result').style.display = 'block';
                    document.getElementById('output').textContent = 'Running seeder...';

                    try {{
                        const csrftoken = getCookie('csrftoken');
                        const response = await fetch(`?days=${{days}}&interval=${{interval}}`, {{
                            method: 'POST',
                            headers: {{
                                'Content-Type': 'application/json',
                                'X-CSRFToken': csrftoken
                            }},
                            credentials: 'include'
                        }});
                        const data = await response.json();
                        document.getElementById('output').textContent =
                            JSON.stringify(data, null, 2);
                    }} catch (error) {{
                        document.getElementById('output').textContent = 'Error: ' + error.message;
                    }}
                }});
            </script>
        </body>
        </html>
        """
        return HttpResponse(html)

    # Handle POST request - execute seeding
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
