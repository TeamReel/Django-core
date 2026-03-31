"""Tests for WP04 — Serializer Validation (parameters_schema + preprocessing_config).

Tests verify that:
- validate_parameters_schema() accepts valid schemas and rejects invalid ones
- validate_preprocessing_config() accepts valid configs and rejects invalid ones
- All 10 seeded templates pass serializer validation (regression guard)
"""

import pytest
from rest_framework.exceptions import ValidationError

from src.generative.models import GenerationTemplate
from src.generative.serializers import GenerationTemplateSerializer


# ==============================================================================
# Fixtures
# ==============================================================================


@pytest.fixture
def base_template_data(db) -> dict:
    """Minimal valid template data for partial-update serializer tests."""
    return {}


@pytest.fixture
def existing_template(db) -> GenerationTemplate:
    """Return the first active seeded template for partial-update tests."""
    return GenerationTemplate.objects.filter(is_active=True).first()


# ==============================================================================
# validate_parameters_schema tests (T012)
# ==============================================================================


@pytest.mark.django_db
class TestValidateParametersSchema:
    def test_parameters_schema_valid_passes(self, existing_template: GenerationTemplate) -> None:
        schema = {
            "color": {
                "label": "Kleur",
                "type": "select",
                "options": ["red", "blue"],
                "default": "red",
            },
        }
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"parameters_schema": schema}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

    def test_parameters_schema_missing_label_fails(
        self, existing_template: GenerationTemplate
    ) -> None:
        schema = {"color": {"type": "select"}}
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"parameters_schema": schema}, partial=True
        )
        assert not serializer.is_valid()
        assert "parameters_schema" in serializer.errors

    def test_parameters_schema_missing_type_fails(
        self, existing_template: GenerationTemplate
    ) -> None:
        schema = {"color": {"label": "Kleur"}}
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"parameters_schema": schema}, partial=True
        )
        assert not serializer.is_valid()
        assert "parameters_schema" in serializer.errors

    def test_parameters_schema_non_dict_value_fails(
        self, existing_template: GenerationTemplate
    ) -> None:
        schema = {"color": "not_a_dict"}
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"parameters_schema": schema}, partial=True
        )
        assert not serializer.is_valid()
        assert "parameters_schema" in serializer.errors

    def test_parameters_schema_empty_passes(
        self, existing_template: GenerationTemplate
    ) -> None:
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"parameters_schema": {}}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

    def test_parameters_schema_seed_data_passes(self) -> None:
        """All seeded templates must pass serializer validation (regression guard)."""
        templates = GenerationTemplate.objects.filter(is_active=True)
        assert templates.count() >= 10, f"Expected >= 10 seeded templates, got {templates.count()}"
        for template in templates:
            serializer = GenerationTemplateSerializer(
                instance=template,
                data={"parameters_schema": template.parameters_schema},
                partial=True,
            )
            assert serializer.is_valid(), (
                f"Template '{template.slug}' failed: {serializer.errors}"
            )


# ==============================================================================
# validate_preprocessing_config tests (T014)
# ==============================================================================


@pytest.mark.django_db
class TestValidatePreprocessingConfig:
    def test_preprocessing_config_valid_passes(
        self, existing_template: GenerationTemplate
    ) -> None:
        config = {"logo": "standardize_logo", "sponsor": "standardize_sponsor"}
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"preprocessing_config": config}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

    def test_preprocessing_config_non_string_value_fails(
        self, existing_template: GenerationTemplate
    ) -> None:
        config = {"logo": 123}
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"preprocessing_config": config}, partial=True
        )
        assert not serializer.is_valid()
        assert "preprocessing_config" in serializer.errors

    def test_preprocessing_config_non_dict_fails(
        self, existing_template: GenerationTemplate
    ) -> None:
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"preprocessing_config": "not_a_dict"}, partial=True
        )
        assert not serializer.is_valid()
        assert "preprocessing_config" in serializer.errors

    def test_preprocessing_config_empty_passes(
        self, existing_template: GenerationTemplate
    ) -> None:
        serializer = GenerationTemplateSerializer(
            instance=existing_template, data={"preprocessing_config": {}}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

    def test_preprocessing_config_seed_data_passes(self) -> None:
        """All seeded templates must pass preprocessing_config validation."""
        templates = GenerationTemplate.objects.filter(is_active=True)
        assert templates.count() >= 10, f"Expected >= 10 seeded templates, got {templates.count()}"
        for template in templates:
            serializer = GenerationTemplateSerializer(
                instance=template,
                data={"preprocessing_config": template.preprocessing_config},
                partial=True,
            )
            assert serializer.is_valid(), (
                f"Template '{template.slug}' failed: {serializer.errors}"
            )
