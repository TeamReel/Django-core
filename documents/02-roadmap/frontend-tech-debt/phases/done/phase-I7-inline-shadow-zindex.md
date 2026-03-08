# I7 — Inline Shadow + Z-index → Tokens

**Status:** ✅ Done
**Geschatte effort:** 30 min
**Scope:** 16 `boxShadow` + 10 `zIndex` in inline styles → tokens

---

## Doel

Laatste inline style tokenisatie: box-shadows en z-index standaardiseren. Klein aantal maar hoge impact — shadows bepalen elevation hiërarchie, z-index voorkomt layer conflicts.

---

## Box-shadow mapping

| Inline waarde | Token |
|---------------|-------|
| `0 1px 2px rgba(...)` | `'var(--shadow-xs)'` |
| `0 2px 4px rgba(...)` / `0 2px 8px rgba(...)` | `'var(--shadow-sm)'` |
| `0 4px 6px rgba(...)` / `0 4px 12px rgba(...)` | `'var(--shadow-md)'` |
| `0 4px 16px rgba(...)` / `0 8px 16px rgba(...)` | `'var(--shadow-lg)'` |
| `0 8px 32px rgba(...)` | `'var(--shadow-xl)'` |
| `none` | `'none'` (behouden) |

## Z-index mapping

| Inline waarde | Token |
|---------------|-------|
| `1`–`10` | `'var(--z-base)'` (1) |
| `100` | `'var(--z-dropdown)'` (100) |
| `200` | `'var(--z-sticky)'` (200) |
| `500`–`600` | `'var(--z-overlay)'` (500) |
| `1000` | `'var(--z-modal)'` (1000) |
| `1100` | `'var(--z-toast)'` (1100) |
| `1200` | `'var(--z-tooltip)'` (1200) |
| `9999` | `'var(--z-max)'` (9999) |

---

## Top bestanden

| Bestand | Type | Waarden |
|---------|------|---------|
| `Modal.tsx` | shadow + z-index | `0 8px 32px rgba(...)`, `zIndex: 1000` |
| `OrganisationListPage.tsx` | shadow | `0 2px 4px rgba(...)` |
| `OrgEditMemberRoleModal.tsx` | shadow | `0 4px 12px rgba(...)` |
| `ProjectsPage.tsx` | shadow | `0 4px 6px rgba(...)` |
| `VideoPreviewModal.tsx` | shadow | `0 8px 32px rgba(...)` |
| `Toast.module.css` | shadow | `0 4px 16px rgba(...)` (CSS) |

---

## Verificatie

- [ ] Alle inline boxShadow → shadow tokens
- [ ] Alle inline zIndex → z-index tokens
- [ ] `npx vite build` slaagt
- [ ] Elevation hiërarchie consistent
