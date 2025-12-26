from django.urls import path

from . import views

urlpatterns = [
    path("token/", views.get_websocket_token, name="websocket_token"),
]
