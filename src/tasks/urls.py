"""URL configuration for tasks app."""

from django.urls import path

from .views import TasksDebugView, TasksHealthView, TasksListView

app_name = "tasks"

urlpatterns = [
    path("health/", TasksHealthView.as_view(), name="health"),
    path("debug/", TasksDebugView.as_view(), name="debug"),
    path("", TasksListView.as_view(), name="list"),
]
