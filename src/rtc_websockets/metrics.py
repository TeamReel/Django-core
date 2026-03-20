from observability.metrics import emit_metric


def inc_websocket_connections(consumer_type):
    emit_metric("counter", "websocket_connections_total", 1, {"type": consumer_type})
    emit_metric("gauge_delta", "websocket_connections_active", 1, {"type": consumer_type})


def dec_websocket_connections(consumer_type):
    emit_metric("gauge_delta", "websocket_connections_active", -1, {"type": consumer_type})


def inc_websocket_messages_sent(consumer_type):
    emit_metric("counter", "websocket_messages_sent_total", 1, {"type": consumer_type})


def inc_websocket_messages_received(consumer_type):
    emit_metric("counter", "websocket_messages_received_total", 1, {"type": consumer_type})


def inc_websocket_errors(consumer_type, error_type):
    emit_metric(
        "counter", "websocket_errors_total", 1, {"type": consumer_type, "error": error_type}
    )


def inc_websocket_rate_limit_violations(consumer_type):
    emit_metric("counter", "websocket_rate_limit_violations_total", 1, {"type": consumer_type})


# B64 H4 — Event publishing and subscription metrics


def inc_event_published(event_type: str) -> None:
    """Increment counter when a realtime event is published."""
    emit_metric("counter", "websocket_events_published_total", 1, {"event_type": event_type})


def inc_subscriptions(consumer_type: str) -> None:
    """Track a new channel subscription."""
    emit_metric("gauge_delta", "websocket_subscriptions_active", 1, {"type": consumer_type})


def dec_subscriptions(consumer_type: str) -> None:
    """Track a channel unsubscription."""
    emit_metric("gauge_delta", "websocket_subscriptions_active", -1, {"type": consumer_type})
