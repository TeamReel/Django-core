"""URL routing for i18n preference API endpoints."""
from django.urls import path
from . import views

app_name = "i18n_preferences"

urlpatterns = [
    path("me/", views.UserPreferenceView.as_view(), name="user-preference"),
    path("effective/", views.EffectivePreferenceView.as_view(), name="effective-preference"),
    path(
        "organisations/<uuid:org_id>/",
        views.OrganisationPreferenceView.as_view(),
        name="org-preference",
    ),
]
