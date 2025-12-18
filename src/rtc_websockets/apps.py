from django.apps import AppConfig


class RtcWebsocketsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rtc_websockets"

    def ready(self):
        from observability.health import register_health_check

        from .health import WebSocketHealthCheck

        register_health_check("websocket", WebSocketHealthCheck(), critical=True)
