# C2 — Wizard CSS

**Status:** ✅ Done — bulk script, alle spatial waarden op grid
**Voltooid:** 2026-03-08 (commit 26bd78c6)
**Geschatte effort:** 30 min
**Bestanden:**
- `demo/src/components/Wizard/Wizard.module.css`
- `demo/src/components/CreateWizard/CreateWizard.module.css`

---

## Doel

De wizard-componenten (recent gebouwd) op grid brengen. Veel waarden zijn al correct, maar er zitten nog 14px paddings, 6px gaps en 13px font-sizes in.

---

## Wizard.module.css (~71% compliant → doel: 95%+)

### Off-grid waarden

| Selector | Property | Huidig | Snap naar |
|----------|----------|--------|-----------|
| `.progressContainer` | height | 3px | **4px** |
| `.card` | padding | 14px 16px | **16px** |
| `.errorBanner` | padding | 14px 16px | **16px** |
| `.errorIcon` | margin-top | 2px | **4px** (of 0) |
| `.retryBtn` | gap | 6px | **8px** |
| `.retryBtn` | font-size | 13px | — (typography) |

**~5 spacing fixes**

---

## CreateWizard.module.css (~60% compliant → doel: 85%+)

Dit is het grootste bestand (~1626 regels). Systematisch per off-grid waarde:

### 6px → 4px of 8px

Zoek alle `6px` in het bestand. Verwacht ~15 voorkomens in:
- field group gaps
- padding-vertical in kleine elementen
- margin-bottom under labels

**Regel:** Kleine gaps (tussen label en input) → **4px**. Grotere gaps (tussen groepen) → **8px**.

### 10px → 8px of 12px

Zoek alle `10px` in het bestand. Verwacht ~18 voorkomens in:
- input padding
- banner padding
- border-radius op inputs
- gap in kaarten

**Regel:** Input padding → **12px**. Small gap → **8px**. Border-radius → **8px of 12px**.

### 14px → 12px of 16px (spacing only)

Zoek `14px` in padding/margin context (niet font-size). Verwacht ~8 voorkomens:
- card padding-top/bottom

**Regel:** Card content padding → **16px** (meer lucht). Tight padding → **12px**.

### 2px en 3px

| Context | Huidig | Snap naar |
|---------|--------|-----------|
| toggle padding | 3px | **4px** |
| margin kleine offsets | 2px | **4px** of 0 |

### Font-sizes (bewust behouden)

`13px`, `14px`, `15px`, `18px` font-sizes worden **niet aangepast** — typography schaal.

---

## Aanpak

1. Open CreateWizard.module.css
2. `Ctrl+H` per waarde met regex: `(?<!font-size:\s*)\b6px\b` → context check → snap
3. Repeat voor 10px, 14px (spatial only), 2px, 3px
4. Doe hetzelfde voor Wizard.module.css

## Verificatie

- [ ] Alle 5 wizard flows visueel checken (content, match, member, project, period)
- [ ] ChooseFlowStep kaartjes — padding/gap consistent
- [ ] Formulier inputs — mooie alignment
- [ ] Empty states — geen layout breaks
- [ ] Mobile (375px) + tablet (768px) check
