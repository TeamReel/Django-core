"""Brand identity integration for B34 Generative Pipelines.

WP06 T044: Brand Context Service

Injects B33 Brand Identity into generation templates for consistent brand voice.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from branding.models import BrandProfile

logger = logging.getLogger("generative.services.brand")


class BrandContextService:
    """Inject brand identity into generation context."""

    @staticmethod
    def get_brand_context(organisation_id: int, brand_id: int | None = None) -> dict[str, Any]:
        """Get brand context for template.

        Args:
            organisation_id: Organisation ID to fetch brand for
            brand_id: Optional specific brand ID (defaults to organisation active brand)

        Returns:
            Brand context dictionary with:
                - brand_name: Brand name
                - design_tokens: All design tokens as {key: value}
                - colors: Color tokens (primary_color, secondary_color, etc.)
                - fonts: Font tokens (font_heading, font_body, etc.)

        Example:
            {
                'brand_name': 'Acme Inc',
                'design_tokens': {'primary_color': '#FF0000', 'font_heading': 'Arial', ...},
                'colors': {'primary': '#FF0000', 'secondary': '#00FF00'},
                'fonts': {'heading': 'Arial', 'body': 'Helvetica'}
            }
        """
        # Lazy import to avoid circular dependencies during app initialization
        from branding.models import BrandProfile

        try:
            if brand_id:
                brand: BrandProfile = BrandProfile.objects.get(
                    id=brand_id, organisation_id=organisation_id
                )
            else:
                # Get organisation active brand (one brand per org)
                brand = BrandProfile.objects.filter(
                    organisation_id=organisation_id, is_active=True
                ).first()

            if not brand:
                logger.warning(
                    f"No brand found for organisation {organisation_id}, brand_id={brand_id}"
                )
                return {}

            # Get merged tokens (includes organisation tokens if project brand)
            all_tokens = brand.get_merged_tokens()

            # Separate colors and fonts for easier template access
            colors = {k.replace("_color", ""): v for k, v in all_tokens.items() if "color" in k}
            fonts = {
                k.replace("font_", ""): v for k, v in all_tokens.items() if k.startswith("font_")
            }

            context = {
                "brand_name": brand.name,
                "design_tokens": all_tokens,
                "colors": colors,
                "fonts": fonts,
            }

            logger.info(
                "Retrieved brand context",
                extra={
                    "organisation_id": organisation_id,
                    "brand_id": str(brand.id),
                    "brand_name": brand.name,
                    "token_count": len(all_tokens),
                },
            )

            return context

        except BrandProfile.DoesNotExist:
            logger.warning(
                f"Brand not found: organisation_id={organisation_id}, brand_id={brand_id}"
            )
            return {}
        except Exception as e:
            logger.error(
                f"Failed to retrieve brand context: {e}",
                extra={"organisation_id": organisation_id, "brand_id": brand_id},
                exc_info=True,
            )
            return {}

    @staticmethod
    def inject_brand_context(
        input_data: dict[str, Any],
        template_config: dict[str, Any],
        organisation_id: int,
    ) -> dict[str, Any]:
        """Inject brand context into input_data if configured.

        Args:
            input_data: Template input data (will be mutated)
            template_config: Template pipeline configuration
            organisation_id: Organisation ID

        Returns:
            Updated input_data with brand context (if enabled)

        Notes:
            - Brand injection is optional per template (use_brand_context flag)
            - Brand context merged into input_data['brand']
            - If brand not found, input_data unchanged
        """
        if not template_config.get("use_brand_context"):
            logger.debug("Brand context injection disabled for template")
            return input_data

        brand_id = template_config.get("brand_id")
        brand_context = BrandContextService.get_brand_context(organisation_id, brand_id)

        if brand_context:
            input_data["brand"] = brand_context
            logger.info(
                "Injected brand context into input_data",
                extra={
                    "organisation_id": organisation_id,
                    "brand_id": brand_id,
                    "brand_name": brand_context.get("brand_name"),
                },
            )
        else:
            logger.warning(
                "Brand context injection enabled but no brand found",
                extra={"organisation_id": organisation_id, "brand_id": brand_id},
            )

        return input_data
