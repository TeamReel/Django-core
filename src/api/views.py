from typing import Any

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet


class BaseAPIViewSet(ModelViewSet):
    """
    Base viewset for all API endpoints.

    Provides:
    - Default authentication (JWT + Session)
    - Permission integration with B08
    - Performance optimization hooks (select_related, prefetch_related)
    - Consistent error handling (via global exception handler)

    Usage:
        class UserViewSet(BaseAPIViewSet):
            queryset = User.objects.all()
            serializer_class = UserSerializer
            permission_classes = [IsAuthenticated, CanViewUser]

            def get_queryset_optimizations(self):
                return {
                    "select_related": ["organisation"],
                    "prefetch_related": ["projects"],
                }
    """

    # Default to requiring authentication
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> Any:
        """
        Override to apply performance optimizations.
        Subclasses should implement get_queryset_optimizations().
        """
        queryset = super().get_queryset()

        # Apply optimizations if defined
        optimizations = self.get_queryset_optimizations()
        if select_related := optimizations.get("select_related"):
            queryset = queryset.select_related(*select_related)
        if prefetch_related := optimizations.get("prefetch_related"):
            queryset = queryset.prefetch_related(*prefetch_related)

        return queryset

    def get_queryset_optimizations(self) -> dict[str, list[str]]:
        """
        Return dict with 'select_related' and 'prefetch_related' lists.
        Override in subclasses to prevent N+1 queries.
        """
        return {}
