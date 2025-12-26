"""Observability app URLs."""

from django.urls import path

from .views import metrics_summary

urlpatterns = [
    path("metrics/", metrics_summary, name="observability-metrics-summary"),
]
