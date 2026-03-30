# H3 — Serializer + Duplicate Cleanup

> **Effort:** ~2 uur | **Impact:** Verwijdert verwarring door duplicate definities, brengt laatste grote serializer onder limiet

## Context

`projects/api/serializers.py` (689 LOC) bevat een duplicate `UserNestedSerializer` (lijn ~13 en ~221). Daarnaast is het bestand bijna 700 regels — boven de 400 LOC target die in H4 (F30) is vastgesteld voor serializer files.

## To do

### projects/api/serializers.py (689 LOC)
- [ ] Read full file, inventariseer alle serializer classes
- [ ] Identificeer de twee `UserNestedSerializer` definities — bepaal welke canonical is
- [ ] Verwijder de duplicate, update imports
- [ ] Split naar logische modules (pattern uit H4):
  - `serializers_project.py` — ProjectSerializer, ProjectCreateSerializer, ProjectListSerializer
  - `serializers_membership.py` — ProjectMembershipSerializer, nested serializers
  - `serializers.py` → barrel re-export
- [ ] Elk bestand <400 LOC

### Verificatie
- [ ] `from projects.api.serializers import X` werkt nog voor alle bestaande imports
- [ ] Alle project-gerelateerde tests groen
- [ ] Geen duplicate class namen meer

## Done criteria

- [ ] `projects/api/serializers.py` → barrel + 2 module files, elk <400 LOC
- [ ] 0 duplicate serializer class definities
- [ ] Alle tests groen
