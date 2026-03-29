from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from search.backend.postgres import PostgresSearchBackend
from search.models import SearchEntry
from search.registry import search_registry
from search.tasks import update_search_index


class Command(BaseCommand):
    help = "Rebuilds the search index for all registered models."

    def add_arguments(self, parser):
        parser.add_argument(
            "--async",
            action="store_true",
            dest="async_mode",
            help="Trigger Celery tasks instead of running inline",
        )

        parser.add_argument(
            "--only",
            type=str,
            default="",
            help=(
                "Comma-separated model labels to include (e.g. accounts.user,projects.project). "
                "If omitted, all registered models are processed."
            ),
        )
        parser.add_argument(
            "--exclude",
            type=str,
            default="",
            help=(
                "Comma-separated model labels or prefixes to skip (e.g. activities,activities.activity). "
                "Matches on label_lower."
            ),
        )
        parser.add_argument(
            "--purge-all",
            action="store_true",
            dest="purge_all",
            help="Delete all existing SearchEntry rows before rebuilding.",
        )
        parser.add_argument(
            "--purge",
            action="store_true",
            dest="purge_selected",
            help="Delete SearchEntry rows only for the selected models before rebuilding.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Optional cap per model (useful for smoke-testing). 0 means no limit.",
        )
        parser.add_argument(
            "--chunk-size",
            type=int,
            default=500,
            help="Iterator chunk size for large tables.",
        )

    def handle(self, *args, **options):
        async_mode = options["async_mode"]
        only_raw = (options.get("only") or "").strip()
        exclude_raw = (options.get("exclude") or "").strip()
        purge_all = bool(options.get("purge_all"))
        purge_selected = bool(options.get("purge_selected"))
        limit = int(options.get("limit") or 0)
        chunk_size = int(options.get("chunk_size") or 500)

        include_labels = (
            {s.strip().lower() for s in only_raw.split(",") if s.strip()} if only_raw else None
        )
        exclude_labels = {s.strip().lower() for s in exclude_raw.split(",") if s.strip()}

        registered_models = list(search_registry.get_registered_models())

        def label_lower(model) -> str:
            return str(getattr(model._meta, "label_lower", "")).strip().lower()

        def is_excluded(model) -> bool:
            ll = label_lower(model)
            if not ll:
                return False
            for ex in exclude_labels:
                if not ex:
                    continue
                if ll == ex or ll.startswith(ex + ".") or ll.startswith(ex):
                    return True
            return False

        def is_included(model) -> bool:
            if include_labels is None:
                return True
            ll = label_lower(model)
            return ll in include_labels

        selected_models = [m for m in registered_models if is_included(m) and not is_excluded(m)]

        self.stdout.write(f"Registered models: {len(registered_models)}")
        self.stdout.write(f"Selected models: {len(selected_models)}")
        if include_labels:
            self.stdout.write(f"  only={sorted(include_labels)}")
        if exclude_labels:
            self.stdout.write(f"  exclude={sorted(exclude_labels)}")
        if limit:
            self.stdout.write(f"  limit_per_model={limit}")

        backend = PostgresSearchBackend()

        if purge_all:
            deleted, _ = SearchEntry.objects.all().delete()
            self.stdout.write(f"Purged ALL SearchEntry rows: {deleted}")
        elif purge_selected:
            # Best-effort: delete by content_type for selected models.
            cts = [ContentType.objects.get_for_model(m) for m in selected_models]
            deleted, _ = SearchEntry.objects.filter(content_type__in=cts).delete()
            self.stdout.write(f"Purged SearchEntry rows for selected models: {deleted}")

        try:
            for model in selected_models:
                model_label = label_lower(model) or model.__name__
                self.stdout.write(f"Processing {model_label}...")

                qs = model.objects.all()
                processed = 0

                # Iterator prevents loading huge tables into memory.
                for obj in qs.iterator(chunk_size=chunk_size):
                    if limit and processed >= limit:
                        break

                    if async_mode:
                        content_type = ContentType.objects.get_for_model(model)
                        update_search_index.delay(content_type.id, obj.pk)
                    else:
                        backend.update_entry(obj)

                    processed += 1
                    if processed % 1000 == 0:
                        self.stdout.write(f"  ...{processed}")

                self.stdout.write(f"Processed {processed} objects for {model_label}.")
        except KeyboardInterrupt:
            self.stderr.write("[!] Interrupted (KeyboardInterrupt).")
            raise

        self.stdout.write("Successfully rebuilt search index.")
