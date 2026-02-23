"""Then vs Now compilation video processor.

Orchestrates data gathering and video composition for Then vs Now
compilation videos.  Follows the same pattern as LineupProcessor.
"""

from __future__ import annotations

import logging

from django.utils import timezone

from src.video.models.job import JobStatus
from src.video.services.processors.base import BaseVideoProcessor, JobCancelledError

logger = logging.getLogger(__name__)


class ThenVsNowProcessor(BaseVideoProcessor):
    """Processor for Then vs Now compilation videos.

    Config schema:
    {
        "project_id": "uuid",          # Team project ID
        "video_type": "sidebyside" | "transformation",
        "period_id": "uuid",           # Optional — season/period ID
        "selected_member_ids": [...],  # Optional — filter to specific members
        "background_url": "https://...",  # Optional — override location background
    }
    """

    output_extension = "mp4"

    def execute(self):
        """Execute the Then vs Now video processing."""
        self._ensure_temp_dir()
        logger.info(
            "then_vs_now_processing_started",
            extra={"job_id": str(self.job.id)},
        )

        self.job.status = JobStatus.PROCESSING
        self.job.started_at = timezone.now()
        self.job.save(update_fields=["status", "started_at", "updated_at"])

        try:
            config = self.job.config or {}
            project_id = config.get("project_id") or str(self.job.project_id)
            video_type = config.get("video_type", "sidebyside")
            selected_member_ids = config.get("selected_member_ids", [])
            # Per-member variant key override: { member_id: "transformation_snap" }
            member_variant_keys = config.get("member_variant_keys", {})

            # Resolve data from database
            (
                members,
                background_url,
                logo_url,
                team_name,
                season_name,
                brand_color,
                sponsor_url,
            ) = self._gather_data(project_id, video_type, selected_member_ids, member_variant_keys)

            if not members:
                raise ValueError(f"No members found with then_vs_now '{video_type}' videos.")

            # Compose the video
            from src.video.services.then_vs_now_composer import compose_then_vs_now_video

            output_path = compose_then_vs_now_video(
                members=members,
                background_url=background_url,
                logo_url=logo_url,
                team_name=team_name,
                season_name=season_name,
                brand_color=brand_color,
                sponsor_url=sponsor_url,
                video_type=video_type,
                output_dir=self.temp_dir,
                progress_callback=self._update_progress,
            )

            # Upload output
            output_file = self._upload_output(str(output_path))

            self.job.output_file = output_file
            self.job.status = JobStatus.COMPLETED
            self.job.completed_at = timezone.now()
            self.job.progress_percent = 100
            self.job.save(
                update_fields=[
                    "output_file",
                    "status",
                    "completed_at",
                    "progress_percent",
                    "updated_at",
                ]
            )

            logger.info(
                "then_vs_now_processing_completed",
                extra={"job_id": str(self.job.id)},
            )
            return output_file

        except JobCancelledError:
            self.job.refresh_from_db()
            if self.job.status != JobStatus.CANCELLED:
                self.job.status = JobStatus.CANCELLED
                self.job.completed_at = timezone.now()
                self.job.save(update_fields=["status", "completed_at", "updated_at"])
            raise

        except Exception as exc:
            logger.exception(
                "then_vs_now_processing_failed",
                extra={"job_id": str(self.job.id)},
            )
            self.job.status = JobStatus.FAILED
            self.job.error_message = str(exc)[:4000]
            self.job.completed_at = timezone.now()
            self.job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
            raise

        finally:
            self._cleanup()

    def _update_progress(self, percent: int):
        """Update job progress percentage."""
        self.job.progress_percent = percent
        self.job.save(update_fields=["progress_percent", "updated_at"])

    def _gather_data(
        self,
        project_id: str,
        video_type: str,
        selected_member_ids: list[str],
        member_variant_keys: dict[str, str] | None = None,
    ) -> tuple:
        """Gather all data needed for the composition.

        Returns:
            Tuple of (members, background_url, logo_url, team_name,
                      season_name, brand_color)
        """
        from django.apps import apps

        from src.video.services.asset_processing_specs import get_ffmpeg_best_url
        from src.video.services.then_vs_now_composer import MemberClip

        Project = apps.get_model("projects", "Project")  # noqa: N806
        ProjectMembership = apps.get_model("projects", "ProjectMembership")  # noqa: N806
        BrandAsset = apps.get_model("branding", "BrandAsset")  # noqa: N806
        BrandProfile = apps.get_model("branding", "BrandProfile")  # noqa: N806

        # ── Team / club projects ──
        project = Project.objects.select_related("parent_project", "organisation").get(
            id=project_id
        )
        team_name = project.name
        club_project = project.parent_project

        # ── Season / period name ──
        season_name = None
        period_id = (self.job.config or {}).get("period_id")
        if period_id:
            try:
                Period = apps.get_model("periods", "Period")  # noqa: N806
                period = Period.objects.get(id=period_id)
                season_name = period.name
            except Exception:
                pass

        # ── Background URL (prefer config override, then brand asset) ──
        background_url = (self.job.config or {}).get("background_url")
        if not background_url:
            background_url = self._resolve_brand_asset_url(
                project,
                club_project,
                ["stadium_background"],
                BrandProfile,
                BrandAsset,
            )
        if not background_url:
            raise ValueError(
                "No stadium_background BrandAsset found. "
                "Upload a location background for the club/team, "
                "or select a location in the generation modal."
            )

        # ── Club logo URL ──
        logo_url = self._resolve_brand_asset_url(
            club_project or project,
            project if club_project else None,
            ["logo"],
            BrandProfile,
            BrandAsset,
        )

        # ── Sponsor logo URL (bottom-left, like lineup videos) ──
        sponsor_url = self._resolve_brand_asset_url(
            project,
            club_project,
            ["sponsor_logo"],
            BrandProfile,
            BrandAsset,
        )

        # ── Brand primary color ──
        brand_color = None
        for proj in [project, club_project]:
            if not proj:
                continue
            brand = BrandProfile.objects.filter(project=proj, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()
                value = tokens.get("primary_color") or tokens.get("primary")
                if value:
                    brand_color = value
                    break

        # ── Members with then_vs_now videos ──
        qs = ProjectMembership.objects.filter(project=project).select_related("user")
        if selected_member_ids:
            qs = qs.filter(id__in=selected_member_ids)

        members: list[MemberClip] = []
        for pm in qs:
            meta = pm.metadata or {}
            tr = meta.get("teamreel_assets", {})
            videos = tr.get("videos", {})
            then_vs_now = videos.get("then_vs_now", {})

            # Find matching video variant
            # For transformation, prefer RVM-processed variants (those with
            # processed_source) over AI-only variants.
            variant = None
            member_id_str = str(pm.id)
            if video_type == "sidebyside":
                variant = then_vs_now.get("sidebyside")
            elif video_type == "transformation":
                # If the frontend specified a variant key for this member, use it
                explicit_key = (member_variant_keys or {}).get(member_id_str)
                if explicit_key and explicit_key in then_vs_now:
                    variant = then_vs_now[explicit_key]
                else:
                    # Collect all transformation candidates, prefer RVM-processed
                    best = None
                    for key in list(then_vs_now.keys()):
                        if key == "transformation" or key.startswith("transformation_"):
                            candidate = then_vs_now[key]
                            if isinstance(candidate, dict) and candidate.get("processed_source"):
                                best = candidate
                                break  # RVM-processed is best, stop looking
                            elif best is None:
                                best = candidate
                    variant = best
            else:
                variant = then_vs_now.get(video_type)

            if not variant:
                continue

            url = get_ffmpeg_best_url(variant)
            if not url:
                continue

            # Presign relative paths
            if url and not url.startswith("http"):
                try:
                    from files.utils import get_storage_backend

                    backend = get_storage_backend()
                    url = backend.get_url(url, signed=True, expiry_seconds=3600)
                except Exception:
                    pass

            if url:
                name = pm.user.get_full_name() if pm.user else "Unknown"
                members.append(
                    MemberClip(
                        member_id=str(pm.id),
                        name=name,
                        video_url=url,
                    )
                )

        # Sort by the order specified in selected_member_ids (preserve user's chosen order)
        if selected_member_ids:
            order_map = {mid: idx for idx, mid in enumerate(selected_member_ids)}
            members.sort(key=lambda m: order_map.get(m.member_id, len(selected_member_ids)))
        else:
            # Fallback: sort by name for consistent ordering
            members.sort(key=lambda m: m.name)

        logger.info(
            "then_vs_now_gather: found %d qualifying members " "(type=%s, project=%s)",
            len(members),
            video_type,
            team_name,
        )

        return (
            members,
            background_url,
            logo_url,
            team_name,
            season_name,
            brand_color,
            sponsor_url,
        )

    @staticmethod
    def _resolve_brand_asset_url(
        primary_project,
        fallback_project,
        asset_types: list[str],
        BrandProfile,  # noqa: N803
        BrandAsset,  # noqa: N803
    ) -> str | None:
        """Resolve a brand asset URL, checking primary project then fallback."""
        for proj in [primary_project, fallback_project]:
            if not proj:
                continue
            profile = BrandProfile.objects.filter(project=proj, is_active=True).first()
            if not profile:
                continue
            for asset_type in asset_types:
                asset = (
                    BrandAsset.objects.filter(
                        profile=profile,
                        asset_type=asset_type,
                        is_active=True,
                    )
                    .select_related("file")
                    .first()
                )
                if asset and asset.file:
                    return asset.get_url()
        return None

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Not used — composition handles FFmpeg directly."""
        return []
