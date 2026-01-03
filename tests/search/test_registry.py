import pytest
from unittest.mock import Mock
from src.search.registry import SearchRegistry, SearchIndex, search_registry


# Create a mock for the model class
class MockModel:
    _meta = Mock()


class MockIndex(SearchIndex):
    model = MockModel


@pytest.mark.unit
def test_registry_singleton():
    assert search_registry is not None
    assert isinstance(search_registry, SearchRegistry)


@pytest.mark.unit
def test_register_and_get_index():
    registry = SearchRegistry()

    # Register
    registry.register(MockModel, MockIndex)

    # Retrieve
    index = registry.get_index(MockModel)
    assert index is not None
    assert isinstance(index, MockIndex)
    assert index.model == MockModel


@pytest.mark.unit
def test_get_registered_models():
    registry = SearchRegistry()

    class ModelA:
        pass

    class IndexA(SearchIndex):
        model = ModelA

    registry.register(ModelA, IndexA)

    models_list = registry.get_registered_models()
    assert ModelA in models_list


@pytest.mark.unit
def test_get_index_not_registered():
    registry = SearchRegistry()

    class UnregisteredModel:
        pass

    assert registry.get_index(UnregisteredModel) is None


@pytest.mark.unit
def test_search_index_defaults():
    # Test the default methods of SearchIndex
    index = SearchIndex()
    obj = Mock()
    obj.__str__ = Mock(return_value="Test Object")

    assert index.get_title(obj) == "Test Object"
    assert index.get_description(obj) == ""
    assert index.get_image_url(obj) is None

    # Test get_url with get_absolute_url
    obj.get_absolute_url = Mock(return_value="/test/url")
    assert index.get_url(obj) == "/test/url"

    # Test get_url without get_absolute_url
    del obj.get_absolute_url
    assert index.get_url(obj) == ""

    # Test get_vector raises NotImplementedError
    with pytest.raises(NotImplementedError):
        index.get_vector(obj)
