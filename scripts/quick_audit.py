import json
from django.apps import apps
from django.core.serializers.json import DjangoJSONEncoder


def audit_database():
    print(f"{'Model':<60} | {'Count':<10} | {'Status'}")
    print("-" * 85)

    results = {}

    # Get all models from all installed apps
    all_models = apps.get_models()

    # Sort models by app_label and name
    all_models.sort(key=lambda x: (x._meta.app_label, x._meta.model_name))

    for model in all_models:
        # Skip migration history and specific internal tables if desired,
        # but user asked for "all possible tables".
        # We'll skip migrations as it's not "demo data".
        if model._meta.model_name == "migration":
            continue

        model_label = f"{model._meta.app_label}.{model._meta.object_name}"

        try:
            count = model.objects.count()
            if count == 0:
                status = "❌ EMPTY"
            elif count < 5:
                status = "⚠️ THIN"
            else:
                status = "✅ OK"

            print(f"{model_label:<60} | {count:<10} | {status}")
            results[model_label] = count
        except Exception as e:
            print(f"{model_label:<60} | {'Error':<10} | ⚠️ {str(e)}")

    # Specific check for Football structure
    print("\n--- Football Structure Check ---")
    try:
        Org = apps.get_model("organisations.Organisation")
        football_leagues = [
            "Eredivisie",
            "Premier League",
            "Serie A",
            "Bundesliga",
            "La Liga",
            "Ligue 1",
        ]
        existing_leagues = Org.objects.filter(name__in=football_leagues).count()
        print(f"Football Leagues Found: {existing_leagues}/{len(football_leagues)}")

        Project = apps.get_model("projects.Project")
        club_count = Project.objects.filter(organisation__name__in=football_leagues).count()
        print(f"Football Clubs Found: {club_count}")

    except Exception as e:
        print(f"Error checking football structure: {e}")


if __name__ == "__main__":
    audit_database()
