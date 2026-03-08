# T2 — Utility Classes

**Status:** ✅ Done
**Voltooid:** 2026-03-08 (commit 26bd78c6)
**Geschatte effort:** 20 min
**Bestanden:** `demo/src/styles/utility.css`

---

## Doel

Alle off-grid waarden in utility.css snappen naar de 4px grid. Dit zijn de bouwblokken die overal hergebruikt worden.

## Off-grid waarden gevonden

### Gap utilities

| Klasse | Huidig | Snap naar |
|--------|--------|-----------|
| `.gap-2` | 2px | **4px** (of verwijder, gebruik `.gap-4`) |
| `.gap-6` | 6px | **8px** |
| `.gap-10` | 10px | **12px** |

### Padding utilities

| Klasse | Huidig | Snap naar |
|--------|--------|-----------|
| `.p-6` | 6px | **8px** |
| `.p-10` | 10px | **12px** |

### Margin utilities

| Klasse | Huidig | Snap naar |
|--------|--------|-----------|
| `.mt-10` | 10px | **12px** |
| `.mb-10` | 10px | **12px** |

### Border-radius utilities

| Klasse | Huidig | Snap naar |
|--------|--------|-----------|
| `.rounded-6` | 6px | **8px** |
| `.rounded-10` | 10px | **12px** |

### Composite classes

| Klasse | Property | Huidig | Snap naar |
|--------|----------|--------|-----------|
| `.form-input` | padding | 10px | **8px of 12px** |
| `.form-input` | border-radius | 6px | **8px** |
| `.form-textarea` | padding | 10px | **8px of 12px** |
| `.form-label-upper` | margin-bottom | 6px | **8px** |
| `.btn-modal` | padding | 10px 14px | **8px 16px** |
| `.callout-error` | padding | 10px | **12px** |
| `.callout-error` | border-radius | 6px | **8px** |
| `.callout-success` | padding | 10px | **12px** |
| `.badge-overlay` | padding | 2px 8px | **4px 8px** |
| `.badge-overlay` | border-radius | 10px | **12px** |
| `.btn-danger-sm` | padding | 6px 10px | **8px 12px** |
| `.dir-th` | padding | 6px 8px | **8px** |
| `.detail-th` | padding | 6px 8px | **8px** |
| `.detail-td` | padding | 6px 8px | **8px** |
| `.status-label` | margin-bottom | 6px | **8px** |

### Font-size utilities (migratie naar 5-stappen schaal)

Na T1 zijn er nog maar 5 font-size tokens. Utility classes moeten mee:

| Klasse | Huidig | Actie |
|--------|--------|-------|
| `.fs-11` | 11px | **verwijder** — vervang door `--text-xs` (12px) |
| `.fs-12` | 12px | **behoud** als `font-size: var(--text-xs)` |
| `.fs-13` | 13px | **verwijder** — vervang door `--text-sm` (14px) |
| `.fs-14` | 14px | **behoud** als `font-size: var(--text-sm)` |
| `.fs-15` | 15px | **verwijder** — vervang door `--text-base` (16px) |
| `.fs-16` | 16px | **behoud** als `font-size: var(--text-base)` |
| `.fs-18` | 18px | **verwijder** — vervang door `--text-lg` (20px) |
| `.fs-20` | 20px | **behoud** als `font-size: var(--text-lg)` |
| `.fs-24` | 24px | **behoud** als `font-size: var(--text-xl)` |

Alternatief: vervang `.fs-*` classes door semantische namen (`.text-caption`, `.text-body`, `.text-title`, `.text-heading`).

## Aanpak

1. Open `utility.css`
2. Zoek per off-grid value en vervang
3. Hernoem misleidende klassen waar nodig (`.gap-6` → als waarde 8px wordt, hernoem naar `.gap-8` of maak generiek)

**Naamgeving:** Classes als `.gap-6` behouden maar value snappen kan verwarrend zijn. Beter: hernoem naar de nieuwe waarde of gebruik semantische namen.

## Verificatie

- [ ] Grep `gap-6|gap-10|p-6|p-10|mt-10|mb-10|rounded-6|rounded-10` in `demo/src/` — check alle usages
- [ ] Visueel check: formulieren, knoppen, badges, tabellen
- [ ] Geen layout breaks in Chrome DevTools responsive mode
