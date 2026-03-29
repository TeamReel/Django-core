"""Brand Identity Manager models.

This module implements centralized brand management with merge inheritance
pattern for organisations and projects.
"""
import uuid

from django.conf import settings
from django.db import models

# Well-known token keys that should always be present in API responses
WELL_KNOWN_TOKEN_KEYS = [
    "primary_color",
    "secondary_color",
    "accent_color",
    "font_heading",
    "font_body",
    "border_radius",
]


class BrandProfile(models.Model):
    """Brand identity configuration for organisation or project."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="brand_profiles",
        null=True,
        blank=True,
        help_text="Organisation-level brand (null for project-specific brands)",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="brand_profiles",
        null=True,
        blank=True,
        help_text="Project-level brand (null for organisation-level brands)",
    )
    name = models.CharField(max_length=200, help_text="Display name for this brand profile")
    is_active = models.BooleanField(
        default=True, help_text="Inactive profiles are preserved but not returned in API responses"
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_brand_profiles",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_brand_profiles",
    )

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Brand Profile"
        verbose_name_plural = "Brand Profiles"
        # Constraint: exactly one of organisation or project must be set
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(organisation__isnull=False, project__isnull=True)
                    | models.Q(organisation__isnull=True, project__isnull=False)
                ),
                name="brand_profile_org_xor_project",
            ),
            # Unique brand per org/project scope
            models.UniqueConstraint(
                fields=["organisation"],
                condition=models.Q(organisation__isnull=False),
                name="unique_brand_per_organisation",
            ),
            models.UniqueConstraint(
                fields=["project"],
                condition=models.Q(project__isnull=False),
                name="unique_brand_per_project",
            ),
        ]
        indexes = [
            models.Index(fields=["organisation"]),
            models.Index(fields=["project"]),
        ]

    def __str__(self):
        return self.name

    def get_tokens(self):
        """Return all tokens as dict {key: value}."""
        return {token.key: token.value for token in self.design_tokens.all()}

    def get_merged_tokens(self):
        """Return merged tokens (org + project override).

        For project brands, returns organisation tokens with project overrides.
        For organisation brands, returns tokens as-is.
        """
        tokens = {}

        # Start with org tokens if this is a project brand
        if self.project and self.project.organisation:
            org_brand = BrandProfile.objects.filter(
                organisation=self.project.organisation, is_active=True
            ).first()
            if org_brand:
                tokens.update(org_brand.get_tokens())

        # Override with this brand's tokens
        tokens.update(self.get_tokens())

        return tokens

    @staticmethod
    def get_effective_brand(organisation=None, project=None):
        """Get the effective brand for a given org/project context.

        Returns project brand if exists, else org brand, else None.

        Args:
            organisation: Organisation instance or None
            project: Project instance or None

        Returns:
            BrandProfile instance or None
        """
        if project:
            project_brand = BrandProfile.objects.filter(project=project, is_active=True).first()
            if project_brand:
                return project_brand

            organisation = project.organisation

        if organisation:
            return BrandProfile.objects.filter(organisation=organisation, is_active=True).first()

        return None


class DesignToken(models.Model):
    """Individual design token (color, font, spacing, etc)."""

    TYPE_CHOICES = [
        ("color", "Color"),
        ("font", "Font"),
        ("spacing", "Spacing"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        BrandProfile, on_delete=models.CASCADE, related_name="design_tokens"
    )
    key = models.CharField(
        max_length=100, help_text="Token key (e.g., primary_color, font_heading)"
    )
    value = models.CharField(max_length=1000, help_text="Token value (e.g., #FF0000, Roboto, 16px)")
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, default="other")
    description = models.TextField(
        blank=True, null=True, help_text="Optional documentation for this token"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["type", "key"]
        verbose_name = "Design Token"
        verbose_name_plural = "Design Tokens"
        constraints = [
            models.UniqueConstraint(fields=["profile", "key"], name="unique_token_key_per_profile")
        ]
        indexes = [
            models.Index(fields=["profile", "key"]),
            models.Index(fields=["type"]),
        ]

    def __str__(self):
        return f"{self.key}: {self.value}"

    def is_well_known(self):
        """Check if this token key is in the well-known set."""
        return self.key in WELL_KNOWN_TOKEN_KEYS


class AppBackground(models.Model):
    """Global background images available for video generation.

    Managed by superadmins only. Linked to a Sport category so users
    only see backgrounds relevant to their organisation's sport.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sport = models.ForeignKey(
        "sport_configuration.Sport",
        on_delete=models.CASCADE,
        related_name="app_backgrounds",
        help_text="Sport category this background belongs to (e.g. Football)",
    )
    file = models.ForeignKey(
        "files.FileAsset",
        on_delete=models.PROTECT,
        related_name="app_backgrounds",
        help_text="Background image file",
    )
    label = models.CharField(
        max_length=100,
        help_text="Display name shown in picker (e.g. 'Voetbalveld', 'Grasmat avond')",
    )
    sort_order = models.IntegerField(
        default=0,
        help_text="Lower = shown first in picker",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        ordering = ["sort_order", "label"]
        verbose_name = "App Background"
        verbose_name_plural = "App Backgrounds"

    def get_url(self) -> str | None:
        """Return presigned URL for the background image."""
        if not self.file or not self.file.storage_path:
            return None
        try:
            from files.utils import get_storage_backend

            backend = get_storage_backend()
            return backend.get_url(self.file.storage_path, signed=True, expiry_seconds=3600)
        except Exception:
            import logging

            logging.getLogger(__name__).warning(
                "Failed to generate presigned URL for AppBackground %s",
                self.pk,
                exc_info=True,
            )
            return None

    def __str__(self) -> str:
        return f"{self.label} ({self.sport.name})"


class BrandAsset(models.Model):
    """Brand asset (logo, watermark, etc) linked to file storage."""

    ASSET_TYPE_CHOICES = [
        # ── Logo ──
        ("logo_upload", "Logo (Raw Upload)"),
        ("logo", "Logo (AI Processed)"),
        ("watermark", "Watermark"),
        ("favicon", "Favicon"),
        ("font_file", "Font File"),
        # ── Sponsor ──
        ("sponsor_logo_upload", "Sponsor Logo (Raw Upload)"),
        ("sponsor_logo", "Sponsor Logo (AI Processed)"),
        # ── Kit: Home ──
        ("kit_home_upload", "Home Kit (Raw Upload)"),
        ("kit_home", "Home Kit (AI Processed)"),
        ("kit_home_combined", "Home Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Kit: Away ──
        ("kit_away_upload", "Away Kit (Raw Upload)"),
        ("kit_away", "Away Kit (AI Processed)"),
        ("kit_away_combined", "Away Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Kit: Third ──
        ("kit_third_upload", "Third Kit (Raw Upload)"),
        ("kit_third", "Third Kit (AI Processed)"),
        ("kit_third_combined", "Third Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Kit: Goalkeeper ──
        ("kit_goalkeeper_upload", "Goalkeeper Kit (Raw Upload)"),
        ("kit_goalkeeper", "Goalkeeper Kit (AI Processed)"),
        ("kit_goalkeeper_combined", "Goalkeeper Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Kit: Coach ──
        ("kit_coach_upload", "Coach Kit (Raw Upload)"),
        ("kit_coach", "Coach Kit (AI Processed)"),
        ("kit_coach_combined", "Coach Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Kit: Assistant ──
        ("kit_assistant_upload", "Assistant Kit (Raw Upload)"),
        ("kit_assistant", "Assistant Kit (AI Processed)"),
        ("kit_assistant_combined", "Assistant Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Kit: Training ──
        ("kit_training_upload", "Training Kit (Raw Upload)"),
        ("kit_training", "Training Kit (AI Processed)"),
        ("kit_training_combined", "Training Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Kit: Legacy ──
        ("kit_legacy_upload", "Legacy Kit (Raw Upload)"),
        ("kit_legacy", "Legacy Kit (AI Processed)"),
        ("kit_legacy_combined", "Legacy Kit (Combined: Kit+Logo+Sponsor)"),
        # ── Location & Other ──
        ("stadium_background", "Stadium/Pitch Background"),
        ("location_photo", "Location Photo"),
        ("club_background_upload", "Club Background (Raw Upload)"),
        ("club_background", "Club Background (AI Processed)"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(BrandProfile, on_delete=models.CASCADE, related_name="brand_assets")
    file = models.ForeignKey(
        "files.FileAsset",
        on_delete=models.PROTECT,
        related_name="brand_assets",
        help_text="B22 FileAsset reference (PROTECT to prevent accidental deletion)",
    )
    asset_type = models.CharField(max_length=50, choices=ASSET_TYPE_CHOICES)
    label = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional display label for multi-instance types (e.g. club backgrounds)",
    )
    alt_text = models.CharField(
        max_length=255, blank=True, help_text="Accessibility text for images"
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["asset_type"]
        verbose_name = "Brand Asset"
        verbose_name_plural = "Brand Assets"
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "asset_type"],
                name="unique_asset_type_per_profile",
                condition=~models.Q(asset_type__in=["club_background", "club_background_upload"]),
            )
        ]
        indexes = [
            models.Index(fields=["profile", "asset_type"]),
        ]

    def get_url(self):
        """Return presigned URL via storage backend.

        Uses the same pattern as avatar URLs to generate time-limited
        presigned S3 URLs, avoiding 403 errors from Block Public Access.
        """
        if not self.file or not self.file.storage_path:
            return None
        try:
            from files.utils import get_storage_backend

            backend = get_storage_backend()
            return backend.get_url(self.file.storage_path, signed=True, expiry_seconds=3600)
        except Exception:
            import logging

            logging.getLogger(__name__).warning(
                "Failed to generate presigned URL for BrandAsset %s",
                self.pk,
                exc_info=True,
            )
            return None

    def __str__(self):
        return f"{self.profile.name} - {self.get_asset_type_display()}"
