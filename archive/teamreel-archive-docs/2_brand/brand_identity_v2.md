# 🎨 Brand Identity v2 – TeamReel
> Geüpdatete versie met expliciete logo-varianten, tokens-verwijzingen en sandbox-context (geen deployment/cloud afhankelijkheden).
> Versie: November 2025 — Status: Definitieve richtlijn.

## Delta tegenover vorige versie
- Toegevoegd: Sectie *Logo Varianten & Bestanden* met volledige overzicht van assets.
- Toegevoegd: Sandbox-notitie (alle branding lokaal, geen CDN/S3).
- Verwijzing naar `teamreel_style_foundation_v2.md` en `frontend/styles/tokens.json`.
- Behoud van volledige inhoud uit oorspronkelijke `brand_identity.md` (Oktober 2025) als basis.

---
## Logo Varianten & Bestanden
Alle logo’s zijn beschikbaar in `frontend/src/assets/logo/` onder vier categorieën:

| Categorie | Doel | Variants (SVG + PNG) | Voorbeeld gebruik |
|-----------|------|----------------------|-------------------|
| Primary | Kernlogo op lichte/donkere achtergrond | `Logo_primary_dark.svg`, `Logo_primary_light.svg`, `Logo_primary_white.svg`, alternatieve inverse varianten | Navigatie header, marketing visuals |
| Horizontal | Brede variant voor banners of e-mails | `Horizontal wide_dark.svg`, `Horizontal wide_light.svg`, `Horizontal wide_white.svg`, `Horizontal wide_inverse.svg` | Header branding, pdf exports |
| Icon | Compact merkbeeld (zonder woordmerk) | `Icon only dark.svg`, `Icon only light.svg`, `Icon only white.svg` | Favicons, avatars, app badges |
| Favicon | Kleine raster/vector voor browser tab | `favicon dark.svg`, `favicon light.svg`, `favicon white.svg` | Browser tab, PWA manifest |

### Naming Richtlijnen
- `primary` = basis kleurversie.
- `inverse` = omgekeerde contrastvariant voor donkere oppervlakken.
- `white` = monotone witte variant voor overlays.
- `dark` / `light` = geoptimaliseerd voor respectievelijk lichte en donkere achtergronden.

### Gebruik & Toegankelijkheid
| Scenario | Aanbevolen variant | Reden |
|----------|--------------------|-------|
| Licht UI header | `Logo_primary_dark.svg` | Hoog contrast tegen licht achtergrond |
| Donker overlay | `Logo_primary_light.svg` of `Logo_primary_white.svg` | Leesbaarheid behoud |
| E-mail banner | `Horizontal wide_dark.svg` | Brede leesbare compositie |
| App favicon | `favicon light.svg` (licht thema) | Consistente theming |
| Minimalistische mobile view | `Icon only dark.svg` | Compact en herkenbaar |

> Contrastcontrole: alle vaste kleurcombinaties volgen WCAG 2.1 AA; inverse varianten vermijden lage ratio’s.

### Sandbox Notitie
In sandbox-modus worden logo’s **lokaal** geserveerd vanuit de frontend en niet via CDN of S3. Dit garandeert:
- Geen externe afhankelijkheden
- Snelle iteratie op assets
- Reproduceerbare branding voor tests

---
## Koppeling met Style Foundation & Tokens
- Alle kleuren en typografie komen rechtstreeks uit `frontend/styles/tokens.json`.
- Document `teamreel_style_foundation_v2.md` bevat diepere beschrijving van spacing, iconen, en componentregels.
- Geen hardcoded hex-waarden in componenten: uitsluitend CSS custom properties / tokens.

---
## Integratie Richtlijnen (Frontend)
```tsx
// Voorbeeld: Logo component
import Image from 'next/image'

export function BrandLogo({ variant = 'Logo_primary_dark', width = 120 }) {
  return (
    <Image
      src={`/src/assets/logo/primary/${variant}.svg`}
      alt="TeamReel"
      width={width}
      height={Math.round(width * 0.3)}
      priority
    />
  )
}
```
> Let op: In productie kan padstructuur verschillen; sandbox houdt alles lokaal. Pas bij migratie naar cloud build eventueel `public/` strategie toe.

---
## Overgenomen Basisinhoud
De resterende secties (Merkfundament, Visuele Identiteit, Typografie, Toon, Governance, Checklist) zijn identiek aan de vorige versie om consistentie te bewaren. Zie oorspronkelijke document voor volledige paragrafen.

---
## Checklist Brand Identity v2
| Item | Status | Opmerkingen |
|------|--------|-------------|
| Logo varianten aanwezig (4 categorieën) | ✅ | SVG + PNG in elke map |
| Kleurentokens gekoppeld aan assets | ✅ | Via tokens.json referenties |
| Typografietokens consistent | ✅ | Manrope & Inter ingesteld |
| Contrastwaarden gedocumenteerd | ✅ | In Style Foundation v2 + showcase |
| Sandbox compliance (geen CDN/S3) | ✅ | Lokaal alleen |
| Versiebeheer duidelijk (v2) | ✅ | Delta sectie toegevoegd |
| Favicon set compleet | ✅ | Donker / licht / wit |
| Wordmark & icon separation duidelijk | ✅ | Tabel in varianten sectie |

---
## Migratie Notitie (optioneel toekomst)
Bij overgang naar productieomgeving:
- Bestandspad normaliseren naar `public/assets/logo/`.
- CDN-caching toevoegen (vervallen in sandbox).
- Automatische optimalisatie (svgo) integreren in build pipeline.

---
**Kernboodschap:** Brand Identity v2 borgt volledige, modulair uitbreidbare merkconsistentie – klaar voor lokale iteratie zonder externe afhankelijkheden.
