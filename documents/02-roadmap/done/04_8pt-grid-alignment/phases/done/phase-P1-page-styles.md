# P1 — Page Styles

**Status:** ✅ Done — 1.401 spatial waarden gesnapt in 168+ bestanden
**Voltooid:** 2026-03-08 (commit 26bd78c6)
**Geschatte effort:** 30 min
**Bestanden:**
- `demo/src/pages/DashboardPage.module.css`
- `demo/src/pages/activities/MatchDetailPage.module.css`
- `demo/src/pages/aistudio/AIStudioPage.module.css`
- Overige page CSS modules (scan nodig)

---

## Doel

Alle page-level CSS modules op grid brengen. Pages zijn het meest zichtbaar voor gebruikers.

---

## DashboardPage.module.css (~52% compliant → doel: 85%+)

### Off-grid waarden

| Selector | Property | Huidig | Snap naar |
|----------|----------|--------|-----------|
| `.greeting` | font-size | 22px | — (typography) |
| `.greeting` | margin | 0 0 2px | **0 0 4px** |
| `.orgSubtitle` | font-size | 14px | — (typography) |
| `.lowBanner` | gap | 10px | **12px** |
| `.lowBanner` | padding | 10px 14px | **12px 16px** |
| `.lowBanner` | border-radius | 10px | **12px** |
| `.lowBannerText` | font-size | 13px | — (typography) |
| `.lowBannerText strong` | font-size | 14px | — (typography) |
| `.lowBannerText strong` | margin-bottom | 2px | **4px** |
| `.lowBannerBtn` | padding | 6px 14px | **8px 16px** |
| `.lowBannerBtn` | font-size | 13px | — (typography) |
| `.lowBannerBtn` | border-radius | 6px | **8px** |
| `.card` | padding | 14px | **16px** |
| `.cardHeader` | margin-bottom | 10px | **12px** |
| `.cardTitle` | font-size | 14px | — (typography) |
| `.cardTitle` | gap | 6px | **8px** |
| `.summaryGrid @768` | gap | 10px | **12px** |

**~10 spacing fixes**

---

## MatchDetailPage.module.css (~65% compliant → doel: 90%+)

### Off-grid waarden

| Selector | Property | Huidig | Snap naar |
|----------|----------|--------|-----------|
| `.stickyContextBar` | gap | 10px | **12px** |
| `.stickyBackBtn` | padding-v | 6px | **8px** |
| `.iconBtn` | padding | 6px | **8px** |
| `.stickyTitle` | font-size | 13px | — (typography) |
| `h1` | font-size | 18px | — (typography) |
| `.overflowMenu` | min-width | 170px | **168px** of **176px** |
| `.errorMsg` | font-size | 15px | — (typography) |

**~4 spacing fixes**

---

## AIStudioPage.module.css (~55% compliant → doel: 80%+)

### Off-grid waarden (spacing only)

| Selector | Property | Huidig | Snap naar |
|----------|----------|--------|-----------|
| diverse | gap | 10px | **12px** |
| diverse | gap | 6px | **8px** |
| diverse | gap | 5px | **4px** |
| diverse | gap | 1px | **0 of 4px** |
| `.contentCardInfo` | padding | 7px | **8px** |
| `.jobProgressFill` | border-radius | 2px | **4px** |
| `.emptyState` | max-width | 300px | **320px** |
| `.previewContent` | max-width | 500px | **480px of 512px** |

**~10 spacing fixes** (er zijn veel font-size violations maar die zijn typography)

---

## Overige pages (scan nodig)

Andere page CSS modules moeten nog gescand worden:
- `ProjectDetailPage.module.css`
- `IdentityPage.module.css`
- `MembersPage.module.css`
- `SettingsPage.module.css`
- etc.

Verwachting: vergelijkbare patronen (6px, 10px, 14px spacing violations).

## Aanpak

1. Per bestand: zoek off-grid spacing waarden
2. Snap naar dichtstbijzijnde grid point
3. Laat font-sizes in rust (typography schaal)
4. Visueel check per pagina

## Verificatie

- [ ] Dashboard: credit banner, summary cards, kaart layout
- [ ] Match detail: sticky bar, tabs, content
- [ ] AI Studio: job cards, preview modal, progress bars
- [ ] Responsive: 375px, 768px, 1024px per pagina
