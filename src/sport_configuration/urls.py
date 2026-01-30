"""
URL configuration for B32 Sport Configuration API.

Routes:
- /sports/ - Sport CRUD endpoints (WP03)
- /outfits/ - Outfit configuration endpoints (WP04)
- /validation/ - Validation endpoints (WP05)
"""

from rest_framework.routers import DefaultRouter

from sport_configuration.views import SportViewSet

# Create router for sport_configuration API
router = DefaultRouter()
router.register(r"sports", SportViewSet, basename="sport")

# OutfitConfigurationViewSet and ValidationViewSet registered in WP04/WP05

app_name = "sport_configuration"
urlpatterns = router.urls
