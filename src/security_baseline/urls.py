from django.urls import path
from security_baseline.views import SecurityEventsView

urlpatterns = [
    path("events/", SecurityEventsView.as_view(), name="security-events"),
]
