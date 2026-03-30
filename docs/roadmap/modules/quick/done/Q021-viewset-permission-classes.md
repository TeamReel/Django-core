# Q021 — ViewSet permission_classes expliciet maken

| | |
|---|---|
| Status | � REVIEW |
| Bron | Codebase Audit maart 2026 |
| Impact | 🔴 critical |
| Effort | ~2 uur |

## Wat
8 ViewSets missen een expliciete `permission_classes`. Ze vallen terug op de DRF global default (`IsAuthenticated`), maar dat is fragiel — als iemand de default wijzigt, staan deze endpoints open.

## Bestanden
| ViewSet | Bestand |
|---------|---------|
| `AppBackgroundViewSet` | `src/branding/views.py` |
| `ContentTemplateViewSet` | `src/content_generation/views.py` |
| `ContentItemViewSet` | `src/content_generation/views.py` |
| `ContentApprovalViewSet` | `src/content_generation/views.py` |
| `GenerationRequestViewSet` | `src/generative/views.py` |
| `RoleViewSet` | `src/permissions/api/views.py` |
| `RoleAssignmentViewSet` | `src/permissions/api/views.py` |
| `WorkflowTemplateViewSet` | `src/workflows/views/templates.py` |

## Checklist
- [x] Voeg `permission_classes = [IsAuthenticated]` toe aan alle 8 ViewSets
- [x] Check of sommige ook org-scoping nodig hebben (IsProjectMember, etc.)
- [x] Tests
- [x] Verify
