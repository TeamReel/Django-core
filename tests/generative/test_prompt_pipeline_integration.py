"""Integration tests for WP03 — Pipeline Refactor (importlib → PromptService).

Tests verify that:
- _get_template_output_type() uses DB templates
- generate_asset() resolves templates from DB (not importlib)
- generate_video() resolves templates from DB (not importlib)
- list_asset_templates_view() returns DB-backed templates
- _template_to_legacy_dict() produces correct format for video providers
- Q049: list_asset_templates_view() logs errors instead of silently swallowing them
"""

import logging
from unittest.mock import MagicMock, patch

import pytest
from accounts.models import User
from django.core.cache import cache as django_cache
from django.db import DatabaseError
from organisations.models import Organisation

from src.generative.models import GenerationTemplate, ProviderChoices
from src.generative.services.asset_pipeline import (
    _get_template_output_type,
    _template_to_legacy_dict,
    generate_asset,
    generate_video,
)
from src.generative.services.prompt_service import GenerationTemplateNotFoundError  # noqa: F401


# ==============================================================================
# Fixtures
# ==============================================================================


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear Django cache before each test to prevent stale results."""
    django_cache.clear()
    yield
    django_cache.clear()


@pytest.fixture
def creator(db) -> User:
    return User.objects.create_user(email="pipeline@test.com", password="testpass123")


@pytest.fixture
def org(db, creator) -> Organisation:
    return Organisation.objects.create(name="Pipeline Club", slug="pipeline-club", creator=creator)


@pytest.fixture
def image_template(db, org, creator) -> GenerationTemplate:
    return GenerationTemplate.objects.create(
        organisation=org,
        name="Kit Design Home",
        slug="kit_design_home",
        version="1.0.0",
        input_schema={
            "type": "object",
            "required": ["reference_photo", "logo"],
            "properties": {
                "reference_photo": {"type": "string"},
                "logo": {"type": "string"},
            },
        },
        pipeline_config={
            "provider": ProviderChoices.OPENAI,
            "model": "gpt-4",
            "output_type": "image",
            "estimated_cost": 10.0,
        },
        prompt_text="Design a home kit with {sleeves_description} and {neck_description}.",
        parameters_schema={
            "sleeves": {"label": "Mouwen", "type": "select", "default": "short"},
            "neck": {"label": "Kraag", "type": "select", "default": "round"},
        },
        preprocessing_config={"reference_photo": "crop_to_shirt"},
        is_active=True,
        created_by=creator,
    )


@pytest.fixture
def video_template(db, org, creator) -> GenerationTemplate:
    return GenerationTemplate.objects.create(
        organisation=org,
        name="Player Intro Video",
        slug="player_intro_video",
        version="1.0.0",
        input_schema={
            "type": "object",
            "required": ["person_photo"],
            "properties": {"person_photo": {"type": "string"}},
        },
        pipeline_config={
            "provider": ProviderChoices.OPENAI,
            "model": "video-01",
            "output_type": "video",
            "video_config": {"duration": 5, "composite_mode": None},
            "estimated_cost": 50.0,
        },
        prompt_text="Create intro video for {name_description}.",
        parameters_schema={
            "name": {"label": "Naam", "type": "text"},
        },
        is_active=True,
        created_by=creator,
    )


# ==============================================================================
# _template_to_legacy_dict tests
# ==============================================================================


@pytest.mark.django_db
class TestTemplateLegacyDict:
    def test_correct_field_mapping(self, image_template: GenerationTemplate) -> None:
        result = _template_to_legacy_dict(image_template)
        assert result["id"] == "kit_design_home"
        assert result["name"] == "Kit Design Home"
        assert result["output_type"] == "image"
        assert result["input_requirements"] == ["reference_photo", "logo"]
        assert result["parameters"] == image_template.parameters_schema
        assert result["preprocessing"] == {"reference_photo": "crop_to_shirt"}

    def test_video_template_mapping(self, video_template: GenerationTemplate) -> None:
        result = _template_to_legacy_dict(video_template)
        assert result["output_type"] == "video"
        assert result["video_config"] == {"duration": 5, "composite_mode": None}


# ==============================================================================
# _get_template_output_type tests
# ==============================================================================


@pytest.mark.django_db
class TestGetTemplateOutputType:
    def test_image_template(self, image_template: GenerationTemplate) -> None:
        assert _get_template_output_type("kit_design_home") == "image"

    def test_video_template(self, video_template: GenerationTemplate) -> None:
        assert _get_template_output_type("player_intro_video") == "video"

    def test_unknown_template_raises(self) -> None:
        with pytest.raises(ValueError, match="Unknown template"):
            _get_template_output_type("nonexistent_slug")


# ==============================================================================
# generate_asset integration (mocking Gemini API, verifying DB template path)
# ==============================================================================


@pytest.mark.django_db
class TestGenerateAssetDBPath:
    def test_resolves_template_from_db(
        self, image_template: GenerationTemplate
    ) -> None:
        """generate_asset() resolves templates from DB, not importlib.

        Verifies the DB path works by confirming the function reaches
        the Gemini API call (ValueError about missing key, not "Unknown template").
        """
        import sys

        # Mock google.genai since it's not installed in test env
        mock_google = MagicMock()
        saved = {k: sys.modules[k] for k in list(sys.modules) if k.startswith("google")}
        sys.modules["google"] = mock_google
        sys.modules["google.genai"] = mock_google.genai
        sys.modules["google.genai.types"] = mock_google.genai.types
        try:
            with patch(
                "src.generative.services.asset_pipeline.analyze_kit",
                return_value="red shirt",
            ):
                with pytest.raises(ValueError, match="GOOGLE_API_KEY not configured"):
                    generate_asset(
                        template_id="kit_design_home",
                        params={"sleeves": "short", "neck": "round"},
                        input_images={"reference_photo": b"ref", "logo": b"logo"},
                        variant_count=1,
                    )
        finally:
            for k in list(sys.modules):
                if k.startswith("google"):
                    del sys.modules[k]
            sys.modules.update(saved)

    def test_unknown_template_raises(self) -> None:
        with pytest.raises(ValueError, match="Unknown template"):
            generate_asset(
                template_id="nonexistent_template",
                params={},
                input_images={},
            )


# ==============================================================================
# generate_video integration (mocking provider API)
# ==============================================================================


@pytest.mark.django_db
class TestGenerateVideoDBPath:
    def test_unknown_template_raises(self) -> None:
        with pytest.raises(ValueError, match="Unknown template"):
            generate_video(
                template_id="nonexistent_video",
                params={},
                input_images={},
            )

    def test_non_video_template_raises(self, image_template: GenerationTemplate) -> None:
        with pytest.raises(ValueError, match="not a video template"):
            generate_video(
                template_id="kit_design_home",
                params={},
                input_images={},
            )

    @patch("src.generative.services.asset_pipeline._generate_video_minimax")
    def test_uses_db_template_for_video(
        self,
        mock_minimax: MagicMock,
        video_template: GenerationTemplate,
    ) -> None:
        """generate_video() should resolve templates from DB and pass legacy dict to providers."""
        mock_minimax.return_value = {"video_bytes": b"fake_video", "mime_type": "video/mp4"}

        with patch("src.generative.services.asset_pipeline.settings") as mock_settings:
            mock_settings.MINIMAX_API_KEY = "test-key"
            mock_settings.MINIMAX_GROUP_ID = "test-group"
            mock_settings.RUNWAYML_API_SECRET = None
            mock_settings.FAL_KEY = None
            mock_settings.GOOGLE_API_KEY = None

            result = generate_video(
                template_id="player_intro_video",
                params={"name": "Jan"},
                input_images={"person_photo": b"photo"},
            )

        assert result == {"video_bytes": b"fake_video", "mime_type": "video/mp4"}
        # Verify the template dict passed to provider has legacy format
        call_kwargs = mock_minimax.call_args[1]
        assert call_kwargs["template"]["id"] == "player_intro_video"
        assert call_kwargs["template"]["output_type"] == "video"


# ==============================================================================
# list_asset_templates_view integration
# ==============================================================================


@pytest.mark.django_db
class TestListAssetTemplatesView:
    def test_returns_db_templates(
        self,
        image_template: GenerationTemplate,
        video_template: GenerationTemplate,
    ) -> None:
        from django.test import RequestFactory
        from rest_framework.test import force_authenticate

        from src.generative.views_generate import list_asset_templates_view

        factory = RequestFactory()
        request = factory.get("/api/v1/generative/assets/templates/")
        force_authenticate(request, user=image_template.created_by)

        response = list_asset_templates_view(request)
        assert response.status_code == 200
        templates = response.data["templates"]
        slugs = {t["id"] for t in templates}
        assert "kit_design_home" in slugs
        assert "player_intro_video" in slugs

    def test_template_format_matches_legacy(
        self, image_template: GenerationTemplate
    ) -> None:
        from django.test import RequestFactory
        from rest_framework.test import force_authenticate

        from src.generative.views_generate import list_asset_templates_view

        factory = RequestFactory()
        request = factory.get("/api/v1/generative/assets/templates/")
        force_authenticate(request, user=image_template.created_by)

        response = list_asset_templates_view(request)
        tpl = next(t for t in response.data["templates"] if t["id"] == "kit_design_home")
        assert set(tpl.keys()) == {"id", "name", "category", "description", "input_requirements", "parameters"}
        assert tpl["input_requirements"] == ["reference_photo", "logo"]
        assert isinstance(tpl["parameters"], dict)


# ==============================================================================
# Q049 — list_asset_templates_view error handling
# ==============================================================================


@pytest.mark.django_db
class TestListAssetTemplatesViewErrorHandling:
    """Q049: Verify that errors are logged, not silently swallowed."""

    def test_database_error_returns_503_and_logs(
        self,
        image_template: GenerationTemplate,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        from django.test import RequestFactory
        from rest_framework.test import force_authenticate

        from src.generative.views_generate import list_asset_templates_view

        factory = RequestFactory()
        request = factory.get("/api/v1/generative/assets/templates/")
        force_authenticate(request, user=image_template.created_by)

        with (
            patch(
                "src.generative.services.prompt_service.get_active_templates",
                side_effect=DatabaseError("connection refused"),
            ),
            caplog.at_level(logging.ERROR, logger="generative.views.asset"),
        ):
            response = list_asset_templates_view(request)

        assert response.status_code == 503
        assert "error" in response.data
        assert "Database error loading asset templates" in caplog.text

    def test_unexpected_error_returns_200_empty_and_logs(
        self,
        image_template: GenerationTemplate,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        from django.test import RequestFactory
        from rest_framework.test import force_authenticate

        from src.generative.views_generate import list_asset_templates_view

        factory = RequestFactory()
        request = factory.get("/api/v1/generative/assets/templates/")
        force_authenticate(request, user=image_template.created_by)

        with (
            patch(
                "src.generative.services.prompt_service.get_active_templates",
                side_effect=RuntimeError("unexpected"),
            ),
            caplog.at_level(logging.ERROR, logger="generative.views.asset"),
        ):
            response = list_asset_templates_view(request)

        assert response.status_code == 200
        assert response.data["templates"] == []
        assert "Unexpected error loading asset templates" in caplog.text
