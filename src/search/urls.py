from django.urls import path
from search.api.views import SearchAPIView

urlpatterns = [
    path("", SearchAPIView.as_view(), name="search"),
]
