# Q003 — Profiel: 403 errors op projects endpoint

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI/UX Review (Playwright console) |
| Impact | 🔴 critical |
| Effort | ~1 uur |

## Wat
Bij het openen van de Profiel pagina worden er 4× 403 (Forbidden) errors gelogd
op `/api/v1/organisations/.../projects/`. De pagina laadt wel, maar de errors
kunnen functionaliteit breken en vervuilen de console.

**Waarschijnlijke oorzaak**: Profiel haalt project-data op voor de actieve context,
maar de user heeft mogelijk geen permissions voor alle orgs/projects.

## Checklist
- [ ] Reproduceer de 403 errors lokaal
- [ ] Identificeer welke API call het veroorzaakt
- [ ] Fix: permission check voor aanroep, of graceful fallback bij 403
- [ ] Verify dat console schoon is op Profiel pagina
