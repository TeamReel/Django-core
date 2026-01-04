"""URL configuration for tasks app."""

from django.urls import path

from .views import TasksHealthView, TasksListView

app_name = "tasks"

urlpatterns = [
    path("health/", TasksHealthView.as_view(), name="health"),
    path("", TasksListView.as_view(), name="list"),
]
