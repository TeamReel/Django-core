"""Models for Projects & Workspaces Management."""

from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.text import slugify

from ..managers import ActiveProjectManager, AllProjectManager


class Project(models.Model):
    """
    Project/workspace container within an organisation.

    Projects provide scoping context for resources and are owned by organisations.
    Access is controlled at the organisation level (no project-specific memberships).
    """

    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="projects",
        help_text="Organisation that owns this project",
    )

    creator = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="created_projects",
        help_text="User who created this project",
    )

    name = models.CharField(max_length=200, help_text="Human-readable project name")

    slug = models.SlugField(
        max_length=200,
        help_text="URL-safe identifier (auto-generated from name if not provided)",
    )

    description = models.TextField(
        max_length=2000,
        blank=True,
        help_text="Optional project description (up to 2000 characters)",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="False when project is archived (soft deletion)",
    )

    is_private = models.BooleanField(
        default=False,
        help_text="If True, project is only accessible to explicit members (no org-wide access)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when project was archived (NULL if active)",
    )

    # Hierarchical structure for TeamReel (Club → Team)
    parent_project = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        help_text="Parent project (e.g., Club for a Team). NULL = root level.",
    )

    # Master data storage
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible master data storage (e.g., stadium, city, team colors)",
    )

    # Default manager returns only active projects
    objects = ActiveProjectManager()
    all_objects = AllProjectManager()

    class Meta:
        app_label = "projects"
        db_table = "projects_project"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organisation", "slug"], name="unique_project_slug_per_org"
            ),
            # Root projects (clubs): name unique within organisation.
            models.UniqueConstraint(
                Lower("name"),
                "organisation",
                condition=Q(parent_project__isnull=True),
                name="unique_root_project_name_per_org_ci",
            ),
            # Child projects (teams): name unique within the same parent (club) within organisation.
            models.UniqueConstraint(
                Lower("name"),
                "organisation",
                "parent_project",
                condition=Q(parent_project__isnull=False),
                name="unique_child_project_name_per_parent_ci",
            ),
        ]
        indexes = [
            models.Index(fields=["organisation", "is_active"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["organisation", "is_private"]),
        ]

    def __str__(self) -> str:
        """Return string representation of project."""
        privacy_marker = " (Private)" if self.is_private else ""
        return f"{self.organisation.name}/{self.name}{privacy_marker}"

    def get_absolute_url(self) -> str:
        """Return absolute URL for project detail."""
        from django.urls import reverse

        return reverse(
            "api_v1:organisation-projects-detail",
            kwargs={"organisation_id": self.organisation.slug, "slug": self.slug},
        )

    def _generate_unique_slug(self, base_slug: str = None) -> str:
        """
        Generate unique slug with sequential suffix for collisions.

        Args:
            base_slug: Optional base slug to use. If not provided, generated from name.
        """
        if base_slug is None:
            base_slug = slugify(self.name)

        slug = base_slug
        counter = 2
        max_attempts = 100

        while counter <= max_attempts:
            exists = (
                Project.all_objects.filter(organisation_id=self.organisation_id, slug=slug)
                .exclude(pk=self.pk)
                .exists()
            )

            if not exists:
                return slug

            slug = f"{base_slug}-{counter}"
            counter += 1

        raise ValueError(f"Could not generate unique slug after {max_attempts} attempts")

    def save(self, *args, **kwargs):
        """Auto-generate or ensure unique slug, then validate before saving."""
        if not self.slug:
            # No slug provided - generate from name
            self.slug = self._generate_unique_slug()
        else:
            # Slug provided - check if it collides and regenerate if needed
            slug_exists = (
                Project.all_objects.filter(organisation_id=self.organisation_id, slug=self.slug)
                .exclude(pk=self.pk)
                .exists()
            )
            if slug_exists:
                # Collision - regenerate from provided slug
                self.slug = self._generate_unique_slug(base_slug=self.slug)

        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        """Validate model constraints."""
        super().clean()

        # Archived projects must have archived_at timestamp
        if not self.is_active and self.archived_at is None:
            self.archived_at = timezone.now()

        # Active projects must NOT have archived_at
        if self.is_active and self.archived_at is not None:
            self.archived_at = None

    def archive(self) -> None:
        """Archive this project (soft deletion)."""
        if not self.is_active:
            return
        self.is_active = False
        self.archived_at = timezone.now()
        self.save()

    def restore(self) -> None:
        """Restore this archived project."""
        self.is_active = True
        self.archived_at = None
        self.save()
