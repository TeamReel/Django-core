"""URL routing for contextual notifications DRF APIs."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views.org_policy_views import OrganisationNotificationPolicyByOrganisationView
from .views.preference_views import NotificationPreferenceViewSet
from .views.routing_logs_views import RoutingDecisionLogViewSet
from .views.routing_rules_views import RoutingRuleViewSet

app_name = "contextual_notifications"

router = DefaultRouter()
router.register(r"routing-logs", RoutingDecisionLogViewSet, basename="routing-decision-log")
router.register(r"routing-rules", RoutingRuleViewSet, basename="routing-rule")
router.register(r"preferences", NotificationPreferenceViewSet, basename="notification-preference")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "org-policies/organization/<uuid:org_id>/",
        OrganisationNotificationPolicyByOrganisationView.as_view(),
        name="org-notification-policy",
    ),
]
