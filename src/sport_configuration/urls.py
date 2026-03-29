"""
URL configuration for B32 Sport Configuration API.

Routes:
- /sports/ - Sport CRUD endpoints (WP03)
- /outfits/ - Outfit configuration endpoints (WP04)
- /formations/ - Formation CRUD endpoints
- /validation/ - Validation endpoints (WP05)
"""

from rest_framework.routers import DefaultRouter
from sport_configuration.views import (
    FormationViewSet,
    OutfitConfigurationViewSet,
    SportViewSet,
    ValidationViewSet,
)

# Create router for sport_configuration API
router = DefaultRouter()
router.register(r"sports", SportViewSet, basename="sport")
router.register(r"outfits", OutfitConfigurationViewSet, basename="outfit")
router.register(r"formations", FormationViewSet, basename="formation")
router.register(r"validation", ValidationViewSet, basename="validation")

app_name = "sport_configuration"
urlpatterns = router.urls
