# Premium iOS-stijl Design — TeamReel Webapp

> Praktische aanbevelingen om de hele TeamReel webapp een premium, iOS-native uitstraling te geven — binnen het bestaande kleur- en token-systeem.
> Referentie-apps: Apple Settings, Apple Sports, Strava.

---

## Deel 1 — App-breed Design Systeem

> Deze patronen gelden voor **alle pagina's** en worden één keer centraal geïmplementeerd.

---

### 1. Surface-hiërarchie — Cards zonder borders

**Nu:** Cards en pagina-achtergrond zijn vaak allebei wit, gescheiden door `1px solid var(--app-border)`.

**Verbetering:** Gebruik het bestaande surface-contrast beter — `--app-bg` (#EDF6FF) als achtergrond, `--app-surface` (#fff) voor cards. Verwijder de 1px border van card-groepen. Het contrast tussen achtergrond en card is voldoende.

| Element | Token (ongewijzigd) | Wat verandert |
|---------|-------------------|---------------|
| Pagina achtergrond | `--app-bg` | Blijft |
| Card achtergrond | `--app-surface` | Blijft |
| Card border | `--app-border` | **Verwijderen** — contrast doet het werk |
| Card radius | `--radius-lg` | Blijft |

**Toepassen op:** alle `.accordionSection`, `.seasonCompact`, `.nextMatchRow`, list-cards, form-cards.

**Impact:** ★★★★★ — Directe visuele upgrade op elke pagina.

---

### 2. Inset Separators

**Nu:** Lijstscheidingslijnen lopen van links naar rechts over de volle breedte.

**Verbetering:** Separator start pas ná de linker-padding (16px inset). Rechts loopt hij wél door. Gebruik bestaande `--app-border` kleur, maar dunner (0.5px op retina).

```
Volle breedte (nu):        Inset (iOS):
─────────────────────      ····─────────────────
│ Label       Value │      │ Label       Value │
─────────────────────      ····─────────────────
│ Label       Value │      │ Label       Value │
─────────────────────      ····─────────────────
```

**Toepassen op:** alle list-rows, info-rows, accordion-items, selectie-lijsten, settings-lijsten.

**Impact:** ★★★★☆ — Klein detail, groot effect. Hét kenmerk van iOS-lijsten.

---

### 3. Zwevende Section Labels

**Nu:** Sectie-titels zitten ín de card (als accordion header of als bold titel).

**Verbetering:** Voeg kleine, uppercase, muted labels toe **bóven** card-groepen. Dit creëert visuele ademruimte en hiërarchie.

```
TEAM INFO                    ← zwevend label: klein, uppercase, muted
┌──────────────────────────┐
│ Sport           Voetbal  │
│ Club          FC Example │
└──────────────────────────┘

ASSETS                       ← zwevend label
┌──────────────────────────┐
│ Tenue                ✓ > │
│ Sponsor              – > │
└──────────────────────────┘
```

**Stijl:** `--text-xs`, `--font-normal`, `--app-muted-text`, uppercase, `letter-spacing: 0.02em`, `padding-left: 16px`.

**Toepassen op:** alle gegroepeerde secties op hub-pagina's, settings, profiel, beheer.

**Impact:** ★★★★☆ — Duidelijke visuele hiërarchie zonder extra gewicht.

---

### 4. Typografie — Gewichtscontrast

**Nu:** Veel elementen gebruiken `font-semibold` of `font-medium`, waardoor alles even zwaar voelt.

**Verbetering:** iOS gebruikt dramatisch contrast — titels zijn **groot en bold**, body-tekst is **regular weight**. Het verschil komt van grootte en kleur, niet van vetgedruktheid.

| Element | Nu | iOS-stijl |
|---------|-----|-----------|
| Pagina titel | `text-lg extrabold` | **Groter** (28-34px), bold |
| Section label | `text-sm semibold` | `text-xs` regular, uppercase, muted |
| Lijst-label (links) | `text-sm medium` | `text-sm` **regular** |
| Lijst-waarde (rechts) | `text-sm medium` | `text-sm` regular, **muted** |
| Navigeerbare waarde | muted | **Primary kleur** (teal) |

**Vuistregel:** Labels in lijsten worden **lichter** (regular), niet zwaarder. De waarde ernaast is muted. Alleen titels en knoppen zijn bold.

**Impact:** ★★★★☆ — Subtiel maar maakt het geheel veel rustiger.

---

### 5. Tap-feedback op Interactieve Items

**Nu:** Hover-states bestaan, maar er is geen duidelijke touch-feedback op mobiel.

**Verbetering:** Voeg aan alle tap-bare lijstrijen en knoppen een subtle active-state toe:
- Achtergrond wordt iets donkerder (`--app-hover`)
- Schaal naar 0.98 (nauwelijks zichtbaar, maar voelbaar)

**Toepassen op:** alle `button`-elementen in lijsten, accordion-items, card-knoppen.

**Impact:** ★★★☆☆ — Geeft een responsief, native gevoel bij elke tik.

---

### 6. Accordion-animatie verbeteren

**Nu:** Accordions gebruiken een `max-height` hack — soms te traag, soms springerig.

**Verbetering:** Gebruik CSS `grid-template-rows: 0fr → 1fr` met een soepele ease-out curve. Dit geeft vloeiende, iOS-achtige expand/collapse zonder JavaScript.

**Toepassen op:** alle accordions (hub overview, settings, beheer).

**Impact:** ★★★☆☆ — Subtle maar merkbaar bij dagelijks gebruik.

---

### 7. Scroll-gedrag (later)

Geavanceerde patronen voor een toekomstige iteratie:
- **Sticky header** — team/seizoen-context blijft zichtbaar bij scrollen
- **Large → Small title** — titel krimpt naar de navbar bij omhoog scrollen
- **Pull-to-refresh** — data verversen met swipe-down gesture

---

## Deel 2 — Pagina-specifieke aanbevelingen

### Team Hub

| Element | Aanbeveling |
|---------|-------------|
| **Season card** | Vervang tekstuele "Actief" badge door een groene dot (●) — compacter |
| **Next match row** | Gekleurde dot (groen = thuis, oranje = uit), bold teamnamen, datum rechts muted |
| **Team info** | Maak standaard open (geen accordion), met zwevend label erboven |
| **Assets / Beheer** | Houd accordion, voeg zwevend label toe |

### Selectie (Ledenlijst)

| Element | Aanbeveling |
|---------|-------------|
| **Leden-cards** | Inset separators tussen rijen |
| **Profiel-foto** | Ronde avatar (iOS contacten-stijl) met subtiele schaduw |
| **Status-badge** | Capsule-shaped met succes/warning kleuren |

### Wedstrijden

| Element | Aanbeveling |
|---------|-------------|
| **Competitie-accordions** | Zwevend label boven elke competitie-groep |
| **Match-rijen** | Score prominent rechts, datum/locatie als secondary text |
| **Lege staat** | Vriendelijke illustratie + duidelijke CTA ("+ Wedstrijd toevoegen") |

### Settings / Profiel

| Element | Aanbeveling |
|---------|-------------|
| **Profiel-header** | Grote avatar + naam, Apple-ID stijl |
| **Settings-groepen** | Grouped inset lijst met zwevende labels |
| **Toggle/switches** | iOS-stijl switches (bestaand component) |

---

## Implementatie-volgorde

| # | Wat | Waar | Impact |
|---|-----|------|--------|
| 1 | **Cards borderless** — verwijder border, vertrouw op surface-contrast | App-breed (CSS tokens) | ★★★★★ |
| 2 | **Inset separators** — start na 16px padding | App-breed (list-rows) | ★★★★☆ |
| 3 | **Zwevende section labels** — klein, uppercase, muted | Hub + Settings | ★★★★☆ |
| 4 | **Typografie-contrast** — labels regular, waarden muted | App-breed | ★★★★☆ |
| 5 | **Tap-feedback** — active scale + bg op touch | App-breed | ★★★☆☆ |
| 6 | **Accordion-animatie** — grid-rows ipv max-height | App-breed | ★★★☆☆ |
| 7 | **Hub-specifiek** — groene dot, next match enhanced | Team Hub | ★★★☆☆ |
| 8 | **Scroll-gedrag** — sticky header, large title | Later | ★★☆☆☆ |

**Items 1-3 leveren ~70% van het visuele verschil.** De rest is fijnslijpen.

---

## Bestaande tokens die we behouden

| Token | Waarde | Rol |
|-------|--------|-----|
| `--app-bg` | #EDF6FF | Pagina-achtergrond |
| `--app-surface` | #fff | Card-achtergrond |
| `--app-surface-2` | #F0F4F8 | Secundaire achtergrond |
| `--app-text` | #1C355E | Primaire tekst |
| `--app-muted-text` | #6b7280 | Secundaire tekst |
| `--app-border` | #e5e5e5 | Separators (dunner maken) |
| `--app-link` / `--app-primary` | #3B8EA5 | Actie-kleur |
| `--app-success` | #06D6A0 | Succes/actief-indicatie |
| `--radius-lg` | — | Card-radius |

> **Geen nieuwe kleuren nodig.** Alle verbeteringen werken met de bestaande tokens.

---

## Referentie-apps

| App | Wat we hiervan overnemen |
|-----|-------------------------|
| **Apple Settings** | Grouped inset lists, section labels, inset separators |
| **Apple Sports** | Live activity cards, kleur-accenten per team |
| **Strava** | Sportclub context, activity cards, social feed |
| **Apple Fitness+** | Summary cards, premium data-presentatie |

---

## Samenvatting

De TeamReel webapp heeft een solide basis met goede tokens en patronen. De drie veranderingen die het meeste premium iOS-gevoel opleveren:

1. **Borderless cards** — verwijder de 1px border, vertrouw op achtergrond-contrast
2. **Inset separators** — start na de linker-padding, niet full-width
3. **Zwevende section labels** — klein, uppercase, muted, boven de card-groepen

Deze drie veranderingen zijn app-breed toe te passen en transformeren de app van "goede webapp" naar "voelt als native iOS" — zonder het kleurenschema te wijzigen.
