"""URL configuration for transactions API."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BalancePolicyViewSet,
    OrganizationBalanceView,
    ProjectBalanceView,
    TransactionViewSet,
    UsageEventViewSet,
)

app_name = "transactions"

router = DefaultRouter()
router.register(r"usage-events", UsageEventViewSet, basename="usage-event")
router.register(r"transactions", TransactionViewSet, basename="transaction")
router.register(r"balance-policies", BalancePolicyViewSet, basename="balance-policy")

urlpatterns = [
    path(
        "organizations/<uuid:organization_id>/balance/",
        OrganizationBalanceView.as_view(),
        name="organization-balance",
    ),
    path(
        "projects/<int:project_id>/balance/",  # Project uses integer PK
        ProjectBalanceView.as_view(),
        name="project-balance",
    ),
] + router.urls
