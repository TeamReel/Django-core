"""URL routing for B{NUMBER}: {MODULE_TITLE}."""

from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import {MODEL_NAME}ViewSet

router = SimpleRouter()
router.register(r"{URL_NAME}", {MODEL_NAME}ViewSet, basename="{BASENAME}")

urlpatterns = [
    path("", include(router.urls)),
]
