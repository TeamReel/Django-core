"""Observability app URLs."""

from django.urls import path

from .views import metrics_summary, demo_health_check

urlpatterns = [
    path("metrics/", metrics_summary, name="observability-metrics-summary"),
    path("demo-health/", demo_health_check, name="observability-demo-health"),
]
