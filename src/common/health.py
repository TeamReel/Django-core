from __future__ import annotations

from typing import Dict

from django.http import HttpRequest, JsonResponse


def health_check(request: HttpRequest) -> JsonResponse:  # noqa: ARG001
    """Simple health-check endpoint returning JSON status.

    This is intentionally minimal and domain-agnostic.
    """
    payload: Dict[str, str] = {"status": "ok"}
    return JsonResponse(payload)
