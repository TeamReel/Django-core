"""Management command to propagate already-approved image generation jobs
into ProjectMembership.metadata.teamreel_assets.images.

Run this once to fix jobs that were approved before the propagation logic
was added to review_generation_job_view.

Usage:
    python manage.py propagate_approved_images
    python manage.py propagate_approved_images --job-id 43032250-6d55-47e4-ba10-117f70c3e9f1
    python manage.py propagate_approved_images --dry-run
    python manage.py propagate_approved_images --template-id fullbody_in_tenue
"""

from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Propagate approved image generation jobs into membership metadata (images.fullbody, etc.)"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--job-id",
            type=str,
            default=None,
            help="Limit to a specific GenerationJob task_id (UUID)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Show what would be changed without writing anything",
        )
        parser.add_argument(
            "--template-id",
            type=str,
            default="fullbody_in_tenue",
            help="Only process jobs with this template_id (default: fullbody_in_tenue)",
        )

    def handle(self, *args, **options):
        from src.generative.models import GenerationJob
        from src.generative.views_asset import _propagate_approved_image_to_membership

        dry = options["dry_run"]
        job_id = options["job_id"]
        template_id = options["template_id"]

        qs = GenerationJob.objects.filter(
            output_type="image",
            approval_status=GenerationJob.ApprovalStatus.APPROVED,
            template_id=template_id,
        )
        if job_id:
            qs = qs.filter(task_id=job_id)

        total = qs.count()
        self.stdout.write(
            self.style.NOTICE(
                f"Found {total} approved image job(s) for template '{template_id}'"
                + (" (dry-run)" if dry else "")
            )
        )

        fixed = 0
        skipped = 0
        for job in qs:
            approved_variants = [
                v for v in (job.output_variants or []) if v.get("approved") is True
            ]
            if not approved_variants:
                self.stdout.write(
                    f"  Job {job.task_id}: no approved variants — skipping"
                    " (re-approve via UI to trigger propagation)"
                )
                skipped += 1
                continue

            membership_id = job.membership_id
            self.stdout.write(
                f"  Job {job.task_id}: membership={membership_id}, "
                f"{len(approved_variants)} approved variant(s)"
            )
            for v in approved_variants:
                self.stdout.write(
                    f"    -> {v.get('storage_path', '(no path)')} [{v.get('filename', '')}]"
                )

            if not dry:
                try:
                    _propagate_approved_image_to_membership(job)
                    fixed += 1
                except Exception as exc:  # noqa: BLE001
                    self.stdout.write(self.style.ERROR(f"  ERROR for job {job.task_id}: {exc}"))
                    skipped += 1
            else:
                fixed += 1  # count as would-fix

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {'Would fix' if dry else 'Fixed'}: {fixed}, Skipped: {skipped}"
            )
        )
