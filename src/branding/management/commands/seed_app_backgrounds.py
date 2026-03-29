"""Management command to seed AppBackground entries with synthetic field images.

Creates sport-linked backgrounds for all football variants (the most common sport).
Uses the same field rendering logic as the video fallback backgrounds.

Usage:
    python manage.py seed_app_backgrounds
    python manage.py seed_app_backgrounds --force  # Recreate even if already exist
"""
import io
import uuid

from branding.models import AppBackground
from django.core.management.base import BaseCommand
from django.db import transaction
from files.models import FileAsset
from PIL import Image, ImageDraw
from sport_configuration.models import Sport

# Background definitions: (label, field_color_1, field_color_2, line_color, description)
FOOTBALL_BACKGROUNDS = [
    {
        "label": "Voetbalveld",
        "field_color_1": "#1e7b1e",
        "field_color_2": "#228B22",
        "line_color": "#ffffff",
        "sort_order": 0,
    },
    {
        "label": "Kunstgras",
        "field_color_1": "#2d8a4e",
        "field_color_2": "#34a158",
        "line_color": "#ffffff",
        "sort_order": 1,
    },
    {
        "label": "Arena",
        "field_color_1": "#1a6b1a",
        "field_color_2": "#1f7f1f",
        "line_color": "#e0e0e0",
        "sort_order": 2,
    },
    {
        "label": "Avondwedstrijd",
        "field_color_1": "#0f4f0f",
        "field_color_2": "#136513",
        "line_color": "#cccccc",
        "sort_order": 3,
    },
]

WIDTH = 1920
HEIGHT = 1080  # 16:9 landscape


def generate_field_image(
    field_color_1: str,
    field_color_2: str,
    line_color: str,
) -> bytes:
    """Generate a football field background image (16:9 landscape).

    Returns PNG bytes.
    """
    img = Image.new("RGB", (WIDTH, HEIGHT), field_color_1)
    draw = ImageDraw.Draw(img)

    margin = int(min(WIDTH, HEIGHT) * 0.05)
    field_left = margin
    field_right = WIDTH - margin
    field_top = margin
    field_bottom = HEIGHT - margin
    field_width = field_right - field_left
    field_height = field_bottom - field_top
    center_x = WIDTH // 2
    center_y = HEIGHT // 2
    line_width = 3

    # Grass stripes (vertical stripes for landscape field)
    stripe_width = field_width // 10
    for i in range(10):
        x_start = field_left + i * stripe_width
        stripe_color = field_color_1 if i % 2 == 0 else field_color_2
        draw.rectangle(
            [x_start, field_top, x_start + stripe_width, field_bottom],
            fill=stripe_color,
        )

    # Outer boundary
    draw.rectangle(
        [field_left, field_top, field_right, field_bottom],
        outline=line_color,
        width=line_width,
    )

    # Center line (vertical)
    draw.line(
        [(center_x, field_top), (center_x, field_bottom)],
        fill=line_color,
        width=line_width,
    )

    # Center circle
    circle_radius = int(field_height * 0.15)
    draw.ellipse(
        [
            center_x - circle_radius,
            center_y - circle_radius,
            center_x + circle_radius,
            center_y + circle_radius,
        ],
        outline=line_color,
        width=line_width,
    )

    # Center spot
    draw.ellipse(
        [center_x - 5, center_y - 5, center_x + 5, center_y + 5],
        fill=line_color,
    )

    # Penalty areas (left and right)
    penalty_height = int(field_height * 0.6)
    penalty_width = int(field_width * 0.15)
    # Left penalty area
    draw.rectangle(
        [
            field_left,
            center_y - penalty_height // 2,
            field_left + penalty_width,
            center_y + penalty_height // 2,
        ],
        outline=line_color,
        width=line_width,
    )
    # Right penalty area
    draw.rectangle(
        [
            field_right - penalty_width,
            center_y - penalty_height // 2,
            field_right,
            center_y + penalty_height // 2,
        ],
        outline=line_color,
        width=line_width,
    )

    # Goal areas (left and right)
    goal_height = int(field_height * 0.3)
    goal_width = int(field_width * 0.05)
    # Left goal area
    draw.rectangle(
        [
            field_left,
            center_y - goal_height // 2,
            field_left + goal_width,
            center_y + goal_height // 2,
        ],
        outline=line_color,
        width=line_width,
    )
    # Right goal area
    draw.rectangle(
        [
            field_right - goal_width,
            center_y - goal_height // 2,
            field_right,
            center_y + goal_height // 2,
        ],
        outline=line_color,
        width=line_width,
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


class Command(BaseCommand):
    help = "Seed AppBackground entries with synthetic football field images"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete existing AppBackgrounds and recreate",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options["force"]

        if force:
            count = AppBackground.objects.count()
            AppBackground.objects.all().delete()
            self.stdout.write(f"Deleted {count} existing AppBackground(s).")

        # Find football sport (category level — parent_sport is NULL)
        football = Sport.objects.filter(
            slug__in=["football", "voetbal"],
            parent_sport__isnull=True,
        ).first()

        if not football:
            # Try by name
            football = Sport.objects.filter(
                name__icontains="football",
                parent_sport__isnull=True,
            ).first()

        if not football:
            # Fallback: any category-level sport
            football = Sport.objects.filter(parent_sport__isnull=True).first()
            if football:
                self.stdout.write(
                    self.style.WARNING(
                        f"No 'Football' sport found. Using '{football.name}' as fallback."
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR("No sports found in database. Run seed_sports first.")
                )
                return

        self.stdout.write(f"Using sport: {football.name} (id={football.id})")

        # Get first organisation for FileAsset (required FK)
        from organisations.models import Organisation

        org = Organisation.objects.first()
        if not org:
            self.stdout.write(self.style.ERROR("No organisation found. Create one first."))
            return

        # Import storage backend
        from files.utils import get_storage_backend

        backend = get_storage_backend()
        created_count = 0

        for bg_def in FOOTBALL_BACKGROUNDS:
            # Skip if already exists
            if (
                not force
                and AppBackground.objects.filter(label=bg_def["label"], sport=football).exists()
            ):
                self.stdout.write(f"  ⏭ {bg_def['label']} already exists, skipping.")
                continue

            # Generate image
            self.stdout.write(f"  🎨 Generating {bg_def['label']}...")
            png_bytes = generate_field_image(
                field_color_1=bg_def["field_color_1"],
                field_color_2=bg_def["field_color_2"],
                line_color=bg_def["line_color"],
            )

            # Upload to S3
            storage_path = f"app-backgrounds/{uuid.uuid4()}.png"
            backend.save_from_bytes(storage_path, png_bytes, content_type="image/png")

            # Create FileAsset
            file_asset = FileAsset.objects.create(
                organization=org,
                original_name=f"{bg_def['label'].lower().replace(' ', '_')}.png",
                storage_path=storage_path,
                file_size=len(png_bytes),
                mime_type="image/png",
                is_public=False,
                metadata={"width": WIDTH, "height": HEIGHT, "source": "seed_app_backgrounds"},
            )

            # Create AppBackground
            AppBackground.objects.create(
                sport=football,
                file=file_asset,
                label=bg_def["label"],
                sort_order=bg_def["sort_order"],
                is_active=True,
            )

            created_count += 1
            self.stdout.write(self.style.SUCCESS(f"  ✅ Created: {bg_def['label']}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Created {created_count} AppBackground(s) for {football.name}."
            )
        )
