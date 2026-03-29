"""Asset generation views — barrel re-export for backward compatibility.

All views have been split into focused modules:
- views_generate.py — asset generation (generate, models, templates)
- views_save.py — save, history, restore
- views_jobs.py — job status, listing, counts, review
- views_crop.py — image cropping (closeup, halfbody)
- _asset_helpers.py — shared helpers, constants, serializers

This file re-exports everything so existing imports continue to work.
"""

# ── Views ────────────────────────────────────────────────────────────
# ── Helpers & constants (used by tasks_asset, video, management commands) ──
from ._asset_helpers import (  # noqa: F401
    _MODEL_LOOKUP,
    _PROVIDER_DEFAULT_MODEL,
    _TASK_CACHE_PREFIX,
    _TASK_MAX_AGE,
    BRAND_TEMPLATE_MAP,
    CLOSEUP_ALPHA_THRESHOLD,
    CLOSEUP_OUTPUT_SIZE,
    CLOSEUP_PERSON_RATIO,
    HALFBODY_OUTPUT_SIZE,
    HALFBODY_PERSON_RATIO,
    MODEL_REGISTRY,
    AssetGenerateInputSerializer,
    AssetGenerateOutputSerializer,
    AssetVariantSerializer,
    SaveAssetInputSerializer,
    StorageInfoSerializer,
    _auto_dispatch_rvm_processing,
    _cleanup_old_tasks,
    _create_generation_job,
    _crop_closeup_guest_player,
    _get_model_cost_usd,
    _get_task,
    _propagate_approved_guest_avatar_to_project,
    _propagate_approved_image_to_brand,
    _propagate_approved_image_to_membership,
    _propagate_approved_video_to_membership,
    _run_video_generation,
    _run_video_upload,
    _set_task,
    _smart_crop_closeup,
    _smart_crop_halfbody,
    _upload_image_bytes_to_storage,
)
from .views_crop import (  # noqa: F401
    crop_closeup_from_fullbody_view,
    crop_halfbody_from_fullbody_view,
)
from .views_generate import (  # noqa: F401
    generate_asset_view,
    list_asset_models_view,
    list_asset_templates_view,
)
from .views_jobs import (  # noqa: F401
    generation_job_counts_view,
    generation_task_status_view,
    list_generation_jobs_view,
    review_generation_job_view,
)
from .views_save import (  # noqa: F401
    list_asset_history_view,
    restore_asset_version_view,
    save_asset_view,
)
