"""
Models for B{NUMBER}: {MODULE_TITLE}.
"""

import uuid

from django.conf import settings
from django.db import models


class {MODEL_NAME}(models.Model):
    """
    {MODEL_DESCRIPTION}

    Part of module B{NUMBER} — {MODULE_TITLE}.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # --- Org-scoping ---
    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="{APP_NAME}_{MODEL_NAME_PLURAL}",
    )

    # --- Core fields ---
    # {FIELDS_PLACEHOLDER}

    # --- Metadata ---
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "{APP_NAME}_{MODEL_TABLE}"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organisation", "-created_at"]),
        ]

    def __str__(self) -> str:
        return str(self.{DISPLAY_FIELD})
