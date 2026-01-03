from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType

from search.registry import search_registry
from search.tasks import update_search_index
from search.backend.postgres import PostgresSearchBackend


class Command(BaseCommand):
    help = "Rebuilds the search index for all registered models."

    def add_arguments(self, parser):
        parser.add_argument(
            "--async",
            action="store_true",
            dest="async_mode",
            help="Trigger Celery tasks instead of running inline",
        )

    def handle(self, *args, **options):
        async_mode = options["async_mode"]
        registered_models = search_registry.get_registered_models()

        self.stdout.write(f"Found {len(registered_models)} registered models.")

        backend = PostgresSearchBackend()

        for model in registered_models:
            model_name = model._meta.label
            self.stdout.write(f"Processing {model_name}...")

            qs = model.objects.all()
            count = qs.count()

            for obj in qs:
                if async_mode:
                    content_type = ContentType.objects.get_for_model(model)
                    update_search_index.delay(content_type.id, obj.pk)
                else:
                    backend.update_entry(obj)

            self.stdout.write(f"Processed {count} objects for {model_name}.")

        self.stdout.write(self.style.SUCCESS("Successfully rebuilt search index."))
