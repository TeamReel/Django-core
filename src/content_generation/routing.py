"""
B31 Content Generation - WebSocket Routing

WebSocket URL patterns for content generation status updates.
"""

from django.urls import path

from .consumers import ContentGenerationConsumer

websocket_urlpatterns = [
    path("ws/content-generation/", ContentGenerationConsumer.as_asgi()),
]
