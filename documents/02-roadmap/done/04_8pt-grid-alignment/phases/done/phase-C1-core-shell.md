# C1 — Core Shell Components

**Status:** ✅ Done — bulk script, alle spatial waarden op grid
**Voltooid:** 2026-03-08 (commit 26bd78c6)
**Geschatte effort:** 25 min
**Bestanden:**
- `demo/src/components/Sidebar.module.css`
- `demo/src/components/MobileBottomNav.module.css`
- `packages/design-system/src/components/BottomSheet/BottomSheet.css.ts`

---

## Doel

De altijd-zichtbare shell-componenten (sidebar, bottom nav, bottom sheet) op grid brengen. Dit zijn de meest bekeken onderdelen.

---

## Sidebar.module.css (~52% compliant → doel: 90%+)

### Off-grid waarden

| Selector | Property | Huidig | Snap naar |
|----------|----------|--------|-----------|
| `.panelA` | padding-top | 57px | **56px** |
| `.sectionTitle` | margin-bottom | 6px | **8px** |
| `.sectionTitle` | font-size | 10px | — (typography, behouden) |
| `.collapseButton` | margin-bottom | 6px | **8px** |
| `.queueBadge` | border-radius | 10px | **12px** |
| `.queueBadge` | padding | 1px 6px | **2px 8px** |
| `.queueBadge` | font-size | 10px | — (typography) |
| `.queueBadge` | min-width | 18px | **20px** |
| `.queueBadgeCollapsed` | padding | 1px 5px | **2px 4px** |
| `.queueBadgeCollapsed` | font-size | 9px | **8px of 10px** (typography) |
| `.queueBadgeCollapsed` | min-width | 14px | **16px** |
| `.queueBadgeCollapsed` | line-height | 14px | **16px** |
| `.expandButton` | top | 65px | **64px** |
| `.expandButton` | right | -14px | **-16px** |
| `.panelB` | padding-top | 57px | **56px** |
| `.panelBTabItem` | padding | 6px 10px | **8px 12px** |
| `.panelBTabItem` | font-size | 13px | — (typography) |
| `.panelBTabIcon` | margin-right | 10px | **12px** |
| `.queueCount` | font-size | 11px | — (typography) |
| `.panelBItem` | border-radius | 6px | **8px** |
| `.panelBItem` | font-size | 14px | — (typography) |
| `.panelBItemIcon` | margin-right | 10px | **12px** |

**~14 spacing fixes** (font-sizes worden bewust niet aangepast)

---

## MobileBottomNav.module.css (~62% compliant → doel: 90%+)

### Off-grid waarden

| Selector | Property | Huidig | Snap naar |
|----------|----------|--------|-----------|
| `.tab` | gap | 2px | **4px** |
| `.tab` | padding | 6px 4px | **4px** (uniform) of **8px 4px** |
| `.tabLabel` | font-size | 10px | — (typography) |
| `.createButton` | width/height | 50px | **48px** |
| `.createButton` | border | 3px | **4px** |

**~4 spacing fixes**

---

## BottomSheet.css.ts (~75% compliant → doel: 95%+)

### Off-grid waarden

| Property | Huidig | Snap naar |
|----------|--------|-----------|
| dragIndicator border-radius | 2px | **4px** (of behouden als micro-detail) |
| overlay top fallback | 57px | **56px** |

**~2 fixes**

---

## Totaal: ~20 spacing fixes

## Verificatie

- [ ] Sidebar collapse/expand animatie check
- [ ] MobileBottomNav: create button touch target ≥ 44px ✅ (48px is prima)
- [ ] BottomSheet: drag indicator ziet er nog goed uit met 4px radius
- [ ] Responsive check: 375px, 768px, 1024px
