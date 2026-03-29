from django.urls import include, path
from files.views import FileViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"files", FileViewSet, basename="file")

urlpatterns = [
    path("", include(router.urls)),
]
