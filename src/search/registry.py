from typing import Type

from django.db import models


class SearchIndex:
    """
    Abstract base class for defining how a model is indexed.
    """

    model: Type[models.Model]

    def get_body_text(self, obj) -> str:
        """Returns the full text content to be indexed."""
        raise NotImplementedError

    def get_title(self, obj) -> str:
        """Returns the title for the search result."""
        return str(obj)

    def get_description(self, obj) -> str:
        """Returns the description for the search result."""
        return ""

    def get_url(self, obj) -> str:
        """Returns the relative URL to the resource."""
        if hasattr(obj, "get_absolute_url"):
            return obj.get_absolute_url()
        return ""

    def get_image_url(self, obj) -> str | None:
        """Returns the image URL for the search result."""
        return None


class SearchRegistry:
    """
    Singleton registry for SearchIndex classes.
    """

    def __init__(self):
        self._registry: dict[Type[models.Model], SearchIndex] = {}

    def register(self, model: Type[models.Model], index_class: Type[SearchIndex]):
        """
        Register a model with a SearchIndex class.
        """
        if model in self._registry:
            # We might want to raise an error or warn, but for now let's overwrite
            # or maybe raise to be strict.
            # raise ValueError(f"Model {model} is already registered.")
            pass

        # Instantiate the index class
        self._registry[model] = index_class()

    def get_index(self, model: Type[models.Model]) -> SearchIndex | None:
        """
        Get the SearchIndex instance for a model.
        """
        return self._registry.get(model)

    def get_registered_models(self) -> list[Type[models.Model]]:
        """
        Get a list of all registered models.
        """
        return list(self._registry.keys())


# Singleton instance
search_registry = SearchRegistry()
