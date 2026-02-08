"""Google Gemini image generation and editing executor.

Uses Gemini 2.0 Flash for multimodal image understanding and generation,
and Imagen 4 for high-quality image generation via Google AI API.

Supported operations:
- Image generation from text prompt
- Image editing (input image + edit instructions)
- Image variation (generate similar versions)
- Image analysis (describe/understand image)

Updated Feb 2026: Uses google.genai SDK (not deprecated google.generativeai)
Models: gemini-2.0-flash, imagen-4.0-generate-001
"""

import base64
import logging
from decimal import Decimal
from io import BytesIO
from typing import Any

from django.conf import settings
from django.core.files.base import ContentFile

from .base import BasePipelineExecutor, ErrorCategory, ExecutionResult

logger = logging.getLogger(__name__)


class GeminiImageExecutor(BasePipelineExecutor):
    """Executor for Gemini/Imagen image operations.

    Supports multiple modes:
    - generate: Text → Image (Imagen 4)
    - edit: Image + Text → Edited Image (Gemini 2.0 Flash + Imagen)
    - analyze: Image → Text description (Gemini 2.0 Flash)
    - variation: Image → Similar variations (Imagen 4)

    Pricing (per image, USD) - Feb 2026:
    - Imagen 4: $0.03 per image (standard), $0.06 (ultra)
    - Gemini 2.0 Flash: ~$0.001 per request
    """

    # Pricing per operation (USD) - Feb 2026
    PRICING = {
        "imagen-4": {"generate": Decimal("0.03"), "variation": Decimal("0.03")},
        "gemini-2.0-flash": {
            "analyze": Decimal("0.001"),  # ~image + 500 tokens output
            "edit": Decimal("0.04"),  # analysis + generation
        },
    }

    # Supported aspect ratios for Imagen 4
    SUPPORTED_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"]

    @property
    def provider_name(self) -> str:
        """Return provider identifier."""
        return "gemini_image"

    def _get_genai_client(self):
        """Get Google GenAI client (new SDK)."""
        try:
            from google import genai
        except ImportError as e:
            raise ImportError(
                "google-genai package required. Install with: " "pip install google-genai"
            ) from e

        api_key = getattr(settings, "GOOGLE_API_KEY", None)
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not configured in settings")

        return genai.Client(api_key=api_key)

    def _get_vertex_client(self):
        """Get Vertex AI client for Imagen (fallback/enterprise)."""
        try:
            from google.cloud import aiplatform
            from vertexai.preview.vision_models import ImageGenerationModel
        except ImportError as e:
            raise ImportError(
                "google-cloud-aiplatform package required. Install with: "
                "pip install google-cloud-aiplatform"
            ) from e

        project_id = getattr(settings, "GOOGLE_CLOUD_PROJECT", None)
        location = getattr(settings, "GOOGLE_CLOUD_LOCATION", "us-central1")

        if not project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT not configured in settings")

        aiplatform.init(project=project_id, location=location)
        return ImageGenerationModel.from_pretrained("imagen-4.0-generate-001")

    async def execute(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None = None,
    ) -> ExecutionResult:
        """Execute Gemini image operation.

        Args:
            template_config: Must include 'mode' (generate/edit/analyze/variation)
                - mode: Operation type
                - size: Output size (default 1024x1024)
                - style: Optional style preset
                - model: Optional model override
            input_data:
                - prompt: Text description (required for generate/edit)
                - image_url: Input image URL (required for edit/analyze/variation)
                - image_base64: Alternative to image_url
                - mask_url: Optional mask for inpainting (edit mode)
            brand_context: Optional brand tokens for style injection

        Returns:
            ExecutionResult with image file or analysis text
        """
        mode = template_config.get("mode", "generate")

        try:
            if mode == "generate":
                return await self._generate_image(template_config, input_data, brand_context)
            elif mode == "edit":
                return await self._edit_image(template_config, input_data, brand_context)
            elif mode == "analyze":
                return await self._analyze_image(template_config, input_data, brand_context)
            elif mode == "variation":
                return await self._generate_variation(template_config, input_data, brand_context)
            else:
                return ExecutionResult(
                    success=False,
                    output_type="image",
                    error_message=f"Unsupported mode: {mode}. Use generate/edit/analyze/variation.",
                    error_category=ErrorCategory.PERMANENT,
                )

        except Exception as e:
            logger.exception(f"Gemini image execution error: {e}")
            return ExecutionResult(
                success=False,
                output_type="image",
                error_message=f"Gemini execution error: {str(e)}",
                error_category=self.classify_error(e),
            )

    async def _generate_image(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None,
    ) -> ExecutionResult:
        """Generate image from text prompt using Imagen 3.

        Args:
            template_config: Config with size, style options
            input_data: Must contain 'prompt'
            brand_context: Optional brand tokens

        Returns:
            ExecutionResult with generated image
        """
        prompt = input_data.get("prompt", "")
        if not prompt:
            return ExecutionResult(
                success=False,
                output_type="image",
                error_message="prompt is required for generate mode",
                error_category=ErrorCategory.PERMANENT,
            )

        # Inject brand context into prompt
        if brand_context:
            prompt = self._enhance_prompt_with_brand(prompt, brand_context)

        size = template_config.get("size", "1024x1024")
        aspect_ratio = template_config.get("aspect_ratio", "1:1")
        negative_prompt = template_config.get("negative_prompt", "")

        try:
            # Use new google.genai SDK with API key (no Vertex needed)
            from google.genai import types

            client = self._get_genai_client()

            # Build config
            config = types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
            )
            if negative_prompt:
                config.negative_prompt = negative_prompt

            # Generate image with Imagen 4
            response = client.models.generate_images(
                model="imagen-4.0-generate-001",
                prompt=prompt,
                config=config,
            )

            if not response.generated_images:
                return ExecutionResult(
                    success=False,
                    output_type="image",
                    error_message="No image generated - content may have been filtered",
                    error_category=ErrorCategory.PERMANENT,
                )

            # Save image to bytes
            image = response.generated_images[0]
            output_buffer = BytesIO()
            image.image.save(output_buffer, format="PNG")
            output_bytes = output_buffer.getvalue()

            cost = self.PRICING["imagen-4"]["generate"]

            return ExecutionResult(
                success=True,
                output_type="image",
                file_content=ContentFile(output_bytes, name="generated.png"),
                actual_cost=cost,
                metadata={
                    "model": "imagen-4.0-generate-001",
                    "mode": "generate",
                    "size": size,
                    "aspect_ratio": aspect_ratio,
                    "prompt_length": len(prompt),
                },
            )

        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate" in error_msg:
                error_category = ErrorCategory.TRANSIENT
            elif "invalid" in error_msg or "blocked" in error_msg:
                error_category = ErrorCategory.PERMANENT
            else:
                error_category = ErrorCategory.UNKNOWN

            return ExecutionResult(
                success=False,
                output_type="image",
                error_message=f"Imagen generation failed: {str(e)}",
                error_category=error_category,
            )

    async def _edit_image(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None,
    ) -> ExecutionResult:
        """Edit existing image using Gemini 2.0 Flash vision + Imagen.

        Two-step process:
        1. Analyze input image with Gemini to understand content
        2. Generate edited version with Imagen using enhanced prompt

        Args:
            template_config: Config with edit instructions
            input_data: Must contain 'image_url' or 'image_base64' and 'prompt'
            brand_context: Optional brand tokens

        Returns:
            ExecutionResult with edited image
        """
        prompt = input_data.get("prompt", "")
        image_url = input_data.get("image_url")
        image_base64 = input_data.get("image_base64")

        if not prompt:
            return ExecutionResult(
                success=False,
                output_type="image",
                error_message="prompt is required for edit mode",
                error_category=ErrorCategory.PERMANENT,
            )

        if not image_url and not image_base64:
            return ExecutionResult(
                success=False,
                output_type="image",
                error_message="image_url or image_base64 is required for edit mode",
                error_category=ErrorCategory.PERMANENT,
            )

        try:
            from google.genai import types

            client = self._get_genai_client()

            # Load image
            if image_base64:
                image_data = base64.b64decode(image_base64)
            else:
                import httpx

                async with httpx.AsyncClient() as http_client:
                    response = await http_client.get(image_url)
                    image_data = response.content

            # Step 1: Analyze image with Gemini 2.0 Flash
            analysis_prompt = f"""Analyze this image in detail. Describe:
1. Main subject and composition
2. Colors and style
3. Any text or logos visible
4. Overall mood/aesthetic

Then, explain how to modify it according to this instruction: {prompt}

Provide a detailed prompt for regenerating this image with the requested changes."""

            # Build content with image for analysis
            content = types.Content(
                parts=[
                    types.Part(text=analysis_prompt),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=image_data)),
                ]
            )

            analysis_response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=content,
            )
            enhanced_prompt = analysis_response.text

            # Inject brand context
            if brand_context:
                enhanced_prompt = self._enhance_prompt_with_brand(enhanced_prompt, brand_context)

            # Step 2: Generate edited version with Imagen 4
            aspect_ratio = template_config.get("aspect_ratio", "1:1")

            gen_config = types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
            )

            response = client.models.generate_images(
                model="imagen-4.0-generate-001",
                prompt=enhanced_prompt,
                config=gen_config,
            )

            if not response.generated_generated_images:
                return ExecutionResult(
                    success=False,
                    output_type="image",
                    error_message="No edited image generated",
                    error_category=ErrorCategory.PERMANENT,
                )

            # Save image to bytes
            image = response.generated_images[0]
            output_buffer = BytesIO()
            image.image.save(output_buffer, format="PNG")
            output_bytes = output_buffer.getvalue()

            cost = self.PRICING["gemini-2.0-flash"]["edit"]

            return ExecutionResult(
                success=True,
                output_type="image",
                file_content=ContentFile(output_bytes, name="edited.png"),
                actual_cost=cost,
                metadata={
                    "model": "gemini-2.0-flash + imagen-4",
                    "mode": "edit",
                    "original_prompt": prompt,
                    "enhanced_prompt": enhanced_prompt[:500],  # Truncate for metadata
                },
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output_type="image",
                error_message=f"Image edit failed: {str(e)}",
                error_category=self.classify_error(e),
            )

    async def _analyze_image(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None,
    ) -> ExecutionResult:
        """Analyze image and return text description using Gemini 2.0 Flash.

        Args:
            template_config: Config with analysis type
            input_data: Must contain 'image_url' or 'image_base64'
            brand_context: Not used for analysis

        Returns:
            ExecutionResult with text analysis
        """
        image_url = input_data.get("image_url")
        image_base64 = input_data.get("image_base64")
        analysis_prompt = input_data.get("prompt", "Describe this image in detail.")

        if not image_url and not image_base64:
            return ExecutionResult(
                success=False,
                output_type="text",
                error_message="image_url or image_base64 is required for analyze mode",
                error_category=ErrorCategory.PERMANENT,
            )

        try:
            from google.genai import types

            client = self._get_genai_client()

            # Load image
            if image_base64:
                image_data = base64.b64decode(image_base64)
            else:
                import httpx

                async with httpx.AsyncClient() as http_client:
                    response = await http_client.get(image_url)
                    image_data = response.content

            # Build content with image
            content = types.Content(
                parts=[
                    types.Part(text=analysis_prompt),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=image_data)),
                ]
            )

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=content,
            )
            analysis_text = response.text

            cost = self.PRICING["gemini-2.0-flash"]["analyze"]

            return ExecutionResult(
                success=True,
                output_type="text",
                content=analysis_text,
                actual_cost=cost,
                metadata={
                    "model": "gemini-2.0-flash",
                    "mode": "analyze",
                    "prompt": analysis_prompt,
                },
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output_type="text",
                error_message=f"Image analysis failed: {str(e)}",
                error_category=self.classify_error(e),
            )

    async def _generate_variation(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
        brand_context: dict[str, Any] | None,
    ) -> ExecutionResult:
        """Generate variation of existing image.

        Uses Gemini to analyze, then Imagen to recreate with variations.

        Args:
            template_config: Config with variation parameters
            input_data: Must contain 'image_url' or 'image_base64'
            brand_context: Optional brand tokens

        Returns:
            ExecutionResult with variation image
        """
        # Variation is essentially edit with a standard "create similar" prompt
        variation_prompt = template_config.get(
            "variation_prompt",
            "Create a variation of this image, maintaining the same subject and style "
            "but with subtle differences in composition and details.",
        )

        input_data_with_prompt = {**input_data, "prompt": variation_prompt}
        return await self._edit_image(template_config, input_data_with_prompt, brand_context)

    def _enhance_prompt_with_brand(self, prompt: str, brand_context: dict) -> str:
        """Enhance prompt with brand identity tokens.

        Args:
            prompt: Original prompt
            brand_context: Brand tokens (colors, style, etc.)

        Returns:
            Enhanced prompt with brand guidelines
        """
        tokens = brand_context.get("tokens", {})
        if not tokens:
            return prompt

        brand_additions = []

        if "primary_color" in tokens:
            brand_additions.append(f"Primary color: {tokens['primary_color']}")
        if "secondary_color" in tokens:
            brand_additions.append(f"Secondary color: {tokens['secondary_color']}")
        if "brand_name" in tokens:
            brand_additions.append(f"Brand: {tokens['brand_name']}")
        if "style" in tokens:
            brand_additions.append(f"Style: {tokens['style']}")

        if brand_additions:
            brand_context_str = " | ".join(brand_additions)
            return f"{prompt}\n\nBrand guidelines: {brand_context_str}"

        return prompt

    def calculate_estimated_cost(
        self,
        template_config: dict[str, Any],
        input_data: dict[str, Any],
    ) -> Decimal:
        """Estimate cost for image operation.

        Args:
            template_config: Pipeline config with 'mode'
            input_data: Input data (not used for image cost estimation)

        Returns:
            Estimated cost in USD
        """
        mode = template_config.get("mode", "generate")

        if mode in ("generate", "variation"):
            base_cost = self.PRICING["imagen-4"]["generate"]
        elif mode == "edit":
            base_cost = self.PRICING["gemini-2.0-flash"]["edit"]
        elif mode == "analyze":
            base_cost = self.PRICING["gemini-2.0-flash"]["analyze"]
        else:
            base_cost = Decimal("0.05")  # Default estimate

        # Add 20% buffer
        return (base_cost * Decimal("1.2")).quantize(Decimal("0.0001"))

    def classify_error(self, error: Exception) -> ErrorCategory:
        """Classify error for retry logic.

        Args:
            error: Exception to classify

        Returns:
            ErrorCategory (TRANSIENT, PERMANENT, or UNKNOWN)
        """
        error_msg = str(error).lower()

        # Transient errors - retry eligible
        if any(
            term in error_msg for term in ["quota", "rate", "timeout", "unavailable", "503", "429"]
        ):
            return ErrorCategory.TRANSIENT

        # Permanent errors - no retry
        if any(
            term in error_msg
            for term in [
                "invalid",
                "blocked",
                "safety",
                "authentication",
                "permission",
                "400",
                "401",
                "403",
            ]
        ):
            return ErrorCategory.PERMANENT

        return ErrorCategory.UNKNOWN
