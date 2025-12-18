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
