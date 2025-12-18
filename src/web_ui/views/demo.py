from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def websocket_demo(request):
    """
    Demo page for WebSocket rate limiting and connectivity.
    """
    return render(
        request,
        "web_ui/websocket_demo.html",
        {
            "title": "WebSocket Rate Limiting Demo",
            "user_id": request.user.id,
        },
    )
