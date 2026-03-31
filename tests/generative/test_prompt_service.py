"""Tests for PromptService — template lookup, prompt resolution, and cache invalidation.

WP02 tests covering:
- T002: get_template() and get_active_templates() with caching
- T004: resolve_prompt() with PARAM_RESOLVERS, special cases
- T006: Signal-based cache invalidation
"""

import pytest
from accounts.models import User
from organisations.models import Organisation

from src.generative.models import GenerationTemplate, ProviderChoices
from src.generative.services.prompt_service import (
    OUTFIT_STYLE_DETAILS,
    PARAM_RESOLVERS,
    ROLE_EQUIPMENT,
    GenerationTemplateNotFoundError,
    get_active_templates,
    get_template,
    invalidate_template_cache,
    resolve_prompt,
)


# ==============================================================================
# Fixtures
# ==============================================================================


@pytest.fixture
def creator(db) -> User:
    return User.objects.create_user(email="creator@test.com", password="testpass123")


@pytest.fixture
def org(db, creator) -> Organisation:
    return Organisation.objects.create(name="Club A", slug="club-a", creator=creator)


@pytest.fixture
def org_b(db, creator) -> Organisation:
    return Organisation.objects.create(name="Club B", slug="club-b", creator=creator)


@pytest.fixture
def _base_schema() -> dict:
    return {"type": "object", "properties": {"text": {"type": "string"}}}


@pytest.fixture
def _base_config() -> dict:
    return {
        "provider": ProviderChoices.OPENAI,
        "model": "gpt-4",
        "prompt_template": "test",
        "estimated_cost": 10.0,
    }


@pytest.fixture
def active_template(db, org, creator, _base_schema, _base_config) -> GenerationTemplate:
    return GenerationTemplate.objects.create(
        organisation=org,
        name="Active Template",
        slug="active-tpl",
        version="1.0.0",
        input_schema=_base_schema,
        pipeline_config=_base_config,
        prompt_text="Hello {name_description}, welcome to {team_description}.",
        is_active=True,
        created_by=creator,
    )


@pytest.fixture
def inactive_template(db, org, creator, _base_schema, _base_config) -> GenerationTemplate:
    return GenerationTemplate.objects.create(
        organisation=org,
        name="Inactive Template",
        slug="inactive-tpl",
        version="1.0.0",
        input_schema=_base_schema,
        pipeline_config=_base_config,
        is_active=False,
        created_by=creator,
    )


@pytest.fixture
def global_template(db, creator, _base_schema, _base_config) -> GenerationTemplate:
    return GenerationTemplate.objects.create(
        organisation=None,
        name="Global Template",
        slug="global-tpl",
        version="1.0.0",
        input_schema=_base_schema,
        pipeline_config=_base_config,
        is_active=True,
        created_by=creator,
    )


@pytest.fixture
def org_b_template(db, org_b, creator, _base_schema, _base_config) -> GenerationTemplate:
    return GenerationTemplate.objects.create(
        organisation=org_b,
        name="Club B Template",
        slug="club-b-tpl",
        version="1.0.0",
        input_schema=_base_schema,
        pipeline_config=_base_config,
        is_active=True,
        created_by=creator,
    )


# ==============================================================================
# T002 — get_template() tests
# ==============================================================================


@pytest.mark.django_db
class TestGetTemplate:
    def test_returns_active_template(self, active_template: GenerationTemplate) -> None:
        result = get_template("active-tpl")
        assert result.pk == active_template.pk
        assert result.slug == "active-tpl"

    def test_not_found_raises(self) -> None:
        with pytest.raises(GenerationTemplateNotFoundError) as exc_info:
            get_template("nonexistent-slug")
        assert exc_info.value.slug == "nonexistent-slug"
        assert "nonexistent-slug" in str(exc_info.value)

    def test_inactive_not_returned(self, inactive_template: GenerationTemplate) -> None:
        with pytest.raises(GenerationTemplateNotFoundError):
            get_template("inactive-tpl")

    def test_cache_hit(self, active_template: GenerationTemplate, django_assert_num_queries) -> None:
        # Prime the cache
        get_template("active-tpl")
        invalidate_template_cache()
        # First call after invalidation hits DB
        get_template("active-tpl")
        # Second call should hit cache — 0 queries
        with django_assert_num_queries(0):
            result = get_template("active-tpl")
        assert result.pk == active_template.pk

    def test_global_template_returned_for_org(
        self, global_template: GenerationTemplate, org: Organisation
    ) -> None:
        result = get_template("global-tpl", organisation_id=org.pk)
        assert result.pk == global_template.pk


# ==============================================================================
# T002 — get_active_templates() tests
# ==============================================================================


@pytest.mark.django_db
class TestGetActiveTemplates:
    def test_returns_only_active(
        self,
        active_template: GenerationTemplate,
        inactive_template: GenerationTemplate,
    ) -> None:
        templates = get_active_templates()
        slugs = {t.slug for t in templates}
        assert "active-tpl" in slugs
        assert "inactive-tpl" not in slugs

    def test_org_scoped(
        self,
        active_template: GenerationTemplate,
        org_b_template: GenerationTemplate,
        org: Organisation,
    ) -> None:
        templates = get_active_templates(organisation_id=org.pk)
        slugs = {t.slug for t in templates}
        assert "active-tpl" in slugs
        assert "club-b-tpl" not in slugs

    def test_global_included_for_org(
        self,
        global_template: GenerationTemplate,
        org: Organisation,
    ) -> None:
        templates = get_active_templates(organisation_id=org.pk)
        slugs = {t.slug for t in templates}
        assert "global-tpl" in slugs


# ==============================================================================
# T004 — resolve_prompt() tests
# ==============================================================================


@pytest.mark.django_db
class TestResolvePrompt:
    def test_basic_substitution(self, active_template: GenerationTemplate) -> None:
        result = resolve_prompt(
            active_template,
            params={"name": "Jan", "team": "FC Test"},
        )
        assert result == "Hello Jan, welcome to FC Test."

    def test_param_resolver_lookup(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Skin Tone Test",
            slug="skin-tone-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Skin: {skin_tone_label}",
            parameters_schema={"skin_tone": {"label": "Huidskleur", "type": "select", "default": "light"}},
            is_active=True,
            created_by=creator,
        )
        # No "skin_tone" in PARAM_RESOLVERS, but sleeves is — test a real resolver
        tpl2 = GenerationTemplate.objects.create(
            organisation=org,
            name="Sleeves Test",
            slug="sleeves-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Sleeves: {sleeves_label}",
            parameters_schema={"sleeves": {"label": "Mouwen", "type": "select", "default": "short"}},
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(tpl2, params={"sleeves": "long"})
        assert result == "Sleeves: LONG SLEEVES"

    def test_role_equipment(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Equipment Test",
            slug="equip-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Equipment: {role_equipment}",
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(tpl, params={"role": "goalkeeper"})
        assert ROLE_EQUIPMENT["goalkeeper"] in result

    def test_home_kit_override(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Kit Override Test",
            slug="kit-override-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Base: {shirt_base_label}, Pattern: {pattern_style_label}",
            parameters_schema={
                "shirt_base": {"label": "Shirt", "type": "select", "default": "auto_home"},
                "pattern_style": {"label": "Pattern", "type": "select", "default": "solid"},
            },
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(
            tpl,
            params={"shirt_base": "red", "pattern_style": "vertical_stripes"},
            is_home_kit_design=True,
        )
        assert "MATCH REFERENCE" in result
        # Should NOT contain the user-provided values
        assert "RED" not in result

    def test_user_instruction_appended(self, active_template: GenerationTemplate) -> None:
        result = resolve_prompt(
            active_template,
            params={"name": "Jan", "team": "FC Test", "user_instruction": "Make it blue"},
        )
        assert "ADDITIONAL USER INSTRUCTIONS:" in result
        assert "Make it blue" in result
        assert "IMPORTANT:" in result

    def test_missing_param_left_as_placeholder(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Missing Param Test",
            slug="missing-param-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Value: {unknown_placeholder}",
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(tpl, params={})
        assert "{unknown_placeholder}" in result

    def test_empty_prompt_text(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Empty Prompt",
            slug="empty-prompt",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="",
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(tpl, params={"anything": "value"})
        assert result == ""

    def test_kit_analysis_injection(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Kit Analysis Test",
            slug="kit-analysis-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Kit: {kit_analysis}",
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(tpl, params={}, kit_analysis="Red and white stripes")
        assert result == "Kit: Red and white stripes"

    def test_extra_context_merged(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Extra Context Test",
            slug="extra-ctx-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Custom: {custom_var}",
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(tpl, params={}, extra_context={"custom_var": "injected"})
        assert result == "Custom: injected"

    def test_outfit_style_details(self, db, org, creator, _base_schema, _base_config) -> None:
        tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Outfit Test",
            slug="outfit-test",
            version="1.0.0",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            prompt_text="Outfit: {outfit_style_details}",
            is_active=True,
            created_by=creator,
        )
        result = resolve_prompt(tpl, params={"outfit_style": "coltrui"})
        assert OUTFIT_STYLE_DETAILS["coltrui"] in result


# ==============================================================================
# T006 — Signal-based cache invalidation tests
# ==============================================================================


@pytest.mark.django_db
class TestCacheInvalidation:
    def test_cache_invalidated_on_template_save(
        self, active_template: GenerationTemplate
    ) -> None:
        from unittest.mock import patch

        # Prime cache
        result1 = get_template("active-tpl")
        assert result1.name == "Active Template"

        # Modify and save — signal should call invalidate_template_cache
        with patch(
            "src.generative.signals.invalidate_template_cache"
        ) as mock_invalidate:
            active_template.name = "Updated Template"
            active_template.save()
            mock_invalidate.assert_called_once_with(slug="active-tpl")

    def test_invalidate_template_cache_function(
        self, active_template: GenerationTemplate
    ) -> None:
        from unittest.mock import patch

        # Verify invalidate_template_cache calls CacheService.invalidate_tags
        with patch(
            "src.generative.services.prompt_service.CacheService"
        ) as MockCacheService:
            mock_instance = MockCacheService.return_value
            invalidate_template_cache(slug="active-tpl")
            mock_instance.invalidate_tags.assert_called_once_with(
                ["prompt_templates", "prompt_template:active-tpl"]
            )

    def test_invalidate_without_slug(self) -> None:
        from unittest.mock import patch

        with patch(
            "src.generative.services.prompt_service.CacheService"
        ) as MockCacheService:
            mock_instance = MockCacheService.return_value
            invalidate_template_cache()
            mock_instance.invalidate_tags.assert_called_once_with(
                ["prompt_templates"]
            )


# ==============================================================================
# Constants sanity checks
# ==============================================================================


class TestConstants:
    def test_param_resolvers_not_empty(self) -> None:
        assert len(PARAM_RESOLVERS) >= 20

    def test_role_equipment_has_all_roles(self) -> None:
        assert set(ROLE_EQUIPMENT.keys()) == {"player", "goalkeeper", "coach", "assistant"}

    def test_outfit_style_details_has_all_styles(self) -> None:
        assert set(OUTFIT_STYLE_DETAILS.keys()) == {
            "net_pak",
            "trainings_sweater",
            "coltrui",
            "polo",
            "windbreaker",
        }

    def test_param_resolvers_sleeves_values(self) -> None:
        assert PARAM_RESOLVERS["sleeves"]["short"] == "SHORT SLEEVES"
        assert PARAM_RESOLVERS["sleeves"]["long"] == "LONG SLEEVES"


# ==============================================================================
# Q048 — get_template org-priority + post_delete signal
# ==============================================================================


@pytest.mark.django_db
class TestGetTemplateOrgPriority:
    """Org-specific templates must take priority over global templates with the same slug."""

    def test_org_specific_wins_over_global(
        self, db, org, creator, _base_schema, _base_config
    ) -> None:
        global_tpl = GenerationTemplate.objects.create(
            organisation=None,
            name="Global Shared",
            slug="shared-tpl",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            is_active=True,
            created_by=creator,
        )
        org_tpl = GenerationTemplate.objects.create(
            organisation=org,
            name="Org Override",
            slug="shared-tpl",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            is_active=True,
            created_by=creator,
        )
        invalidate_template_cache()
        result = get_template("shared-tpl", organisation_id=org.pk)
        assert result.pk == org_tpl.pk
        assert result.organisation_id == org.pk

    def test_fallback_to_global_when_no_org_override(
        self, db, org, creator, _base_schema, _base_config
    ) -> None:
        global_tpl = GenerationTemplate.objects.create(
            organisation=None,
            name="Global Only",
            slug="global-only-tpl",
            input_schema=_base_schema,
            pipeline_config=_base_config,
            is_active=True,
            created_by=creator,
        )
        invalidate_template_cache()
        result = get_template("global-only-tpl", organisation_id=org.pk)
        assert result.pk == global_tpl.pk


@pytest.mark.django_db
class TestCacheInvalidationOnDelete:
    def test_cache_invalidated_on_template_delete(
        self, active_template: GenerationTemplate
    ) -> None:
        from unittest.mock import patch

        with patch(
            "src.generative.signals.invalidate_template_cache"
        ) as mock_invalidate:
            active_template.delete()
            mock_invalidate.assert_called_once_with(slug="active-tpl")
