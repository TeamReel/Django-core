"""Tests for WP01: Schema Migration + Seed Data.

Tests cover:
- T001: Organisation FK nullable
- T002: New fields (prompt_text, parameters_schema, preprocessing_config)
- T003: Seed data migration (10 templates)
- T004: Admin fieldsets
- T005: Model validation (parameters_schema structure)
"""

import pytest
from django.core.exceptions import ValidationError

from src.generative.models import GenerationTemplate


@pytest.mark.django_db
class TestOrganisationFKNullable:
    """T001: Organisation FK must be nullable for global templates."""

    def test_create_template_without_organisation(self, user, valid_input_schema, valid_openai_config):
        """Global templates can have organisation=None."""
        template = GenerationTemplate.objects.create(
            organisation=None,
            name="Global Template",
            slug="global-template",
            version="1.0.0",
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        assert template.organisation is None
        assert template.id is not None

    def test_create_template_with_organisation(self, organisation, user, valid_input_schema, valid_openai_config):
        """Org-scoped templates still work as before."""
        template = GenerationTemplate.objects.create(
            organisation=organisation,
            name="Org Template",
            slug="org-template",
            version="1.0.0",
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        assert template.organisation == organisation

    def test_filter_global_templates(self, user, valid_input_schema, valid_openai_config):
        """Can filter for global (org=None) templates."""
        GenerationTemplate.objects.create(
            organisation=None,
            name="Global",
            slug="global-filter-test",
            version="1.0.0",
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        global_templates = GenerationTemplate.objects.filter(organisation__isnull=True)
        assert global_templates.filter(slug="global-filter-test").exists()


@pytest.mark.django_db
class TestNewFields:
    """T002: New fields on GenerationTemplate."""

    def test_prompt_text_field(self, organisation, user, valid_input_schema, valid_openai_config):
        """prompt_text stores the actual prompt template."""
        prompt = "Generate {style} content for {subject}."
        template = GenerationTemplate.objects.create(
            organisation=organisation,
            name="Prompt Test",
            slug="prompt-test",
            version="1.0.0",
            prompt_text=prompt,
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        template.refresh_from_db()
        assert template.prompt_text == prompt

    def test_prompt_text_default_empty(self, template):
        """prompt_text defaults to empty string."""
        assert template.prompt_text == ""

    def test_parameters_schema_field(self, organisation, user, valid_input_schema, valid_openai_config):
        """parameters_schema stores parameter definitions."""
        params = {
            "style": {
                "label": "Stijl",
                "type": "select",
                "options": ["modern", "classic"],
                "default": "modern",
            }
        }
        template = GenerationTemplate.objects.create(
            organisation=organisation,
            name="Params Test",
            slug="params-test",
            version="1.0.0",
            parameters_schema=params,
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        template.refresh_from_db()
        assert template.parameters_schema == params
        assert template.parameters_schema["style"]["label"] == "Stijl"

    def test_parameters_schema_default_empty(self, template):
        """parameters_schema defaults to empty dict."""
        assert template.parameters_schema == {}

    def test_preprocessing_config_field(self, organisation, user, valid_input_schema, valid_openai_config):
        """preprocessing_config stores preprocessing pipeline config."""
        preprocess = {"logo": "square_pad_512", "sponsor": "pad_512_landscape"}
        template = GenerationTemplate.objects.create(
            organisation=organisation,
            name="Preprocess Test",
            slug="preprocess-test",
            version="1.0.0",
            preprocessing_config=preprocess,
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        template.refresh_from_db()
        assert template.preprocessing_config == preprocess

    def test_preprocessing_config_default_empty(self, template):
        """preprocessing_config defaults to empty dict."""
        assert template.preprocessing_config == {}


@pytest.mark.django_db
class TestSeedData:
    """T003: Seed data migration creates 10 templates."""

    EXPECTED_SLUGS = [
        "logo_standardize",
        "sponsor_standardize",
        "tenue_generate",
        "keeper_tenue",
        "tracksuit_generate",
        "coach_outfit",
        "fullbody_in_tenue",
        "closeup_in_tenue",
        "member_intro",
        "member_goal_celebration",
    ]

    def test_seed_template_count(self):
        """Migration seeds exactly 10 templates with prompt_text."""
        count = GenerationTemplate.objects.filter(
            prompt_text__gt="",
            organisation__isnull=True,
        ).count()
        assert count == 10

    def test_all_expected_slugs_exist(self):
        """All 10 expected template slugs exist."""
        for slug in self.EXPECTED_SLUGS:
            assert GenerationTemplate.objects.filter(
                slug=slug,
                organisation__isnull=True,
            ).exists(), f"Missing seed template: {slug}"

    def test_seed_templates_have_prompt_text(self):
        """All seed templates have non-empty prompt_text."""
        for slug in self.EXPECTED_SLUGS:
            tmpl = GenerationTemplate.objects.get(slug=slug, organisation__isnull=True)
            assert tmpl.prompt_text, f"{slug} has empty prompt_text"

    def test_seed_templates_have_parameters_schema(self):
        """All seed templates have non-empty parameters_schema."""
        for slug in self.EXPECTED_SLUGS:
            tmpl = GenerationTemplate.objects.get(slug=slug, organisation__isnull=True)
            assert tmpl.parameters_schema, f"{slug} has empty parameters_schema"
            # Each parameter must have label and type
            for key, param in tmpl.parameters_schema.items():
                assert "label" in param, f"{slug}.{key} missing label"
                assert "type" in param, f"{slug}.{key} missing type"

    def test_seed_templates_are_active(self):
        """All seed templates are active and latest."""
        for slug in self.EXPECTED_SLUGS:
            tmpl = GenerationTemplate.objects.get(slug=slug, organisation__isnull=True)
            assert tmpl.is_active, f"{slug} is not active"
            assert tmpl.is_latest, f"{slug} is not latest"

    def test_seed_templates_have_correct_version(self):
        """All seed templates have version 1.0.0."""
        for slug in self.EXPECTED_SLUGS:
            tmpl = GenerationTemplate.objects.get(slug=slug, organisation__isnull=True)
            assert tmpl.version == "1.0.0", f"{slug} has version {tmpl.version}"

    def test_seed_template_type_mapping(self):
        """Seed templates have correct template_type based on category."""
        member_slugs = {"fullbody_in_tenue", "closeup_in_tenue", "member_intro", "member_goal_celebration"}
        for slug in self.EXPECTED_SLUGS:
            tmpl = GenerationTemplate.objects.get(slug=slug, organisation__isnull=True)
            if slug in member_slugs:
                assert tmpl.template_type == "member", f"{slug} should be 'member'"
            else:
                assert tmpl.template_type == "custom", f"{slug} should be 'custom'"


@pytest.mark.django_db
class TestParametersSchemaValidation:
    """T005: Validate parameters_schema structure in clean()."""

    def test_valid_parameters_schema(self, organisation, user, valid_input_schema, valid_openai_config):
        """Valid parameters_schema passes validation."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Valid Params",
            slug="valid-params",
            version="1.0.0",
            parameters_schema={
                "style": {"label": "Style", "type": "select", "options": ["a", "b"]},
            },
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        # Should not raise
        template.full_clean()

    def test_parameter_missing_label(self, organisation, user, valid_input_schema, valid_openai_config):
        """Parameter without 'label' raises ValidationError."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Missing Label",
            slug="missing-label",
            version="1.0.0",
            parameters_schema={
                "style": {"type": "select"},  # missing label
            },
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "parameters_schema" in exc_info.value.message_dict

    def test_parameter_missing_type(self, organisation, user, valid_input_schema, valid_openai_config):
        """Parameter without 'type' raises ValidationError."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Missing Type",
            slug="missing-type",
            version="1.0.0",
            parameters_schema={
                "style": {"label": "Style"},  # missing type
            },
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "parameters_schema" in exc_info.value.message_dict

    def test_parameter_not_dict(self, organisation, user, valid_input_schema, valid_openai_config):
        """Parameter value that is not a dict raises ValidationError."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Not Dict",
            slug="not-dict",
            version="1.0.0",
            parameters_schema={
                "style": "invalid",  # should be dict
            },
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "parameters_schema" in exc_info.value.message_dict

    def test_empty_parameters_schema_is_valid(self, template):
        """Empty parameters_schema is valid (backward-compatible)."""
        template.parameters_schema = {}
        template.full_clean()  # Should not raise
