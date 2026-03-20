from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
    re_path(r"^ws/presence/(?P<org_id>[0-9a-f-]+)/$", consumers.PresenceConsumer.as_asgi()),
    re_path(r"^ws/activity/(?P<project_id>\d+)/$", consumers.ActivityConsumer.as_asgi()),
    re_path(r"^ws/content-updates/$", consumers.ContentUpdateConsumer.as_asgi()),
    re_path(r"^ws/test/$", consumers.TestConsumer.as_asgi()),
]
