import os

import pytest
from django.conf import settings
from django.core.files.base import ContentFile
from files.backends.local import LocalStorageBackend


@pytest.mark.django_db
class TestLocalStorageBackend:
    def test_save_and_retrieve_file(self, tmp_path):
        # Override MEDIA_ROOT for this test to use a temp directory
        settings.MEDIA_ROOT = str(tmp_path)

        backend = LocalStorageBackend()
        file_content = b"Hello, World!"
        file_name = "test_file.txt"
        content_file = ContentFile(file_content)

        # Test save
        saved_path = backend.save(file_name, content_file)
        assert saved_path == file_name
        assert os.path.exists(os.path.join(tmp_path, file_name))

        # Test open
        retrieved_file = backend.open(saved_path)
        assert retrieved_file.read() == file_content
        retrieved_file.close()

        # Test exists
        assert backend.exists(saved_path)
        assert not backend.exists("non_existent_file.txt")

        # Test delete
        backend.delete(saved_path)
        assert not backend.exists(saved_path)
        assert not os.path.exists(os.path.join(tmp_path, file_name))

    def test_url(self):
        backend = LocalStorageBackend()
        file_name = "test_file.txt"
        # Assuming MEDIA_URL is set in settings, usually '/media/'
        expected_url = settings.MEDIA_URL + file_name
        assert backend.url(file_name) == expected_url
