import os
import re
from typing import List, Tuple

from django.db.models import Q, QuerySet
from django.utils.text import slugify

from ..models import MediaTag


class MediaTagService:
    @staticmethod
    def get_available_tags(project_id: str) -> QuerySet[MediaTag]:
        """Get all tags available for a project (system + project-specific)."""
        return MediaTag.objects.filter(Q(is_system=True) | Q(project_id=project_id)).order_by(
            "name"
        )

    @staticmethod
    def get_or_create_tag(name: str, project_id: str) -> Tuple[MediaTag, bool]:
        """Get or create a project-scoped tag.

        Returns (tag, created) tuple.
        System tags cannot be created through this method.
        """
        slug = slugify(name)

        # Check if system tag with this slug exists
        system_tag = MediaTag.objects.filter(slug=slug, is_system=True).first()
        if system_tag:
            return system_tag, False

        # Check if project tag exists or create it
        project_tag, created = MediaTag.objects.get_or_create(
            slug=slug, project_id=project_id, defaults={"name": name, "is_system": False}
        )
        return project_tag, created

    @staticmethod
    def create_system_tag(name: str) -> MediaTag:
        """Create a system-wide tag (admin only)."""
        slug = slugify(name)

        existing = MediaTag.objects.filter(slug=slug, is_system=True).first()
        if existing:
            return existing

        return MediaTag.objects.create(name=name, slug=slug, project=None, is_system=True)

    @staticmethod
    def generate_tags_from_filename(filename: str) -> List[str]:
        """Extract candidate tags from filename."""
        # 1. Remove extension
        name_without_ext = os.path.splitext(filename)[0]

        # 2. Replace separators with space
        # Regex to replace underscores, hyphens, and multiple spaces
        cleaned_name = re.sub(r"[_\-]+", " ", name_without_ext)

        # 3. Split by space
        words = cleaned_name.split()

        # 4. Filter short words and stopwords
        STOPWORDS = {"the", "and", "for", "with", "img", "vid", "pic", "screen", "shot", "copy"}

        candidates = []
        for word in words:
            word_clean = re.sub(r"[^a-zA-Z0-9]", "", word)  # Basic cleanup
            word_lower = word_clean.lower()

            # Filter logic: length >= 3 and not in stopwords
            if len(word_clean) >= 3 and word_lower not in STOPWORDS:
                candidates.append(word_lower)

        return list(set(candidates))  # Deduplicate
