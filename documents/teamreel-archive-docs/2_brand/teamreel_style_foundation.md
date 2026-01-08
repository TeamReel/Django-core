> **TeamReel** combineert sportieve energie met digitale helderheid.
> Dit document vormt de centrale stijlgids voor alle TeamReel-documentatie, UI-componenten en communicatie.
> De *Style Foundation* beschrijft de visuele tokens, tone-of-voice en consistentieprincipes
> die gelden voor elk onderdeel van het platform — van businessplan tot frontendcode.
> Versie: November 2025 — Status: Definitieve richtlijn.

---

📄 **Referentie**
- Versie: 2.1 (November 2025)
- Onderhoud: TeamReel Studio (Product & Design)
- Bron van waarheid: `/docs/2_brand/teamreel_style_foundation.md`
- Laatste review: [vul datum in bij update]

---

## Inhoudsopgave
- [Inhoudsopgave](#inhoudsopgave)
- [🎨 1. Design Tokens (Merk & UI)](#-1-design-tokens-merk--ui)
  - [Typografie Tokens](#typografie-tokens)
  - [Layout Tokens](#layout-tokens)
- [🗣️ 2. Tone of Voice – Schrijf- en Communicatiestijl](#️-2-tone-of-voice--schrijf--en-communicatiestijl)
  - [Tone by Context](#tone-by-context)
- [💬 3. Kernboodschap (voor alle documenten)](#-3-kernboodschap-voor-alle-documenten)
- [⚙️ 4. Consistentieprincipes](#️-4-consistentieprincipes)
- [🔁 5. Toepassing in Docs (Samenvatting)](#-5-toepassing-in-docs-samenvatting)
- [🔗 Integratie met Frontend & AI](#-integratie-met-frontend--ai)
- [🏁 Slot](#-slot)

---

## 🎨 1. Design Tokens (Merk & UI)

| Token Type | Naam | Code / Waarde | Gebruik |
|-------------|------|----------------|----------|
| **Kleur Primair Donker** | `--color-primary-dark` | `#1C355E` | Headers, tekst, donkere accenten |
| **Kleur Primair Basis** | `--color-primary` | `#3B8EA5` | Knoppen, links, actieve elementen |
| **Kleur Primair Licht** | `--color-primary-light` | `#4CA1FF` | Hover, iconen, subtiele accenten |
| **Accent Warm** | `--color-accent` | `#FF8C42` | Energie, highlights, sportieve details |
| **Neutraal Licht** | `--color-neutral-light` | `#EDF6FF` | Achtergrond lichte UI |
| **Neutraal Donker** | `--color-neutral-dark` | `#0A192F` | Donker thema, video overlays |
| **Error / Alert** | `--color-error` | `#E63946` | Validatiefouten, waarschuwingen |
| **Success** | `--color-success` | `#06D6A0` | Bevestiging, geslaagde actie |
| **Warning** | `--color-warning` | `#FFD166` | Waarschuwingen, neutrale meldingen |

### Typografie Tokens
| Token | Font | Gewicht | Gebruik |
|--------|------|----------|----------|
| `--font-heading` | Manrope | 600–700 | Titels, CTA’s, UI-headers |
| `--font-body` | Inter | 400–500 | Bodytekst, formulieren, beschrijvingen |
| `--font-display` | Bebas Neue | 700 | Sportieve video-headlines |
| `--font-mono` | JetBrains Mono | 400 | Code of logweergave |

### Layout Tokens
| Token | Waarde | Gebruik |
|--------|---------|----------|
| `--radius-card` | 16px | Cards, modals |
| `--radius-button` | 24px | Knoppen |
| `--spacing-base` | 8px | Baseline grid |
| `--shadow-soft` | `0 2px 8px rgba(0,0,0,0.06)` | Hover-effecten |
| `--video-ratio-portrait` | 9:16 | Instagram Reels |
| `--video-ratio-landscape` | 16:9 | Club TV / YouTube |

📦 **Exportformaten:**
Design tokens worden beheerd in `/docs/2_brand/assets/colors/` als JSON en ASE-bestanden.
Frontend synchroniseert automatisch via de `tokens.json` export (Next.js).

---

## 🗣️ 2. Tone of Voice – Schrijf- en Communicatiestijl

| Aspect | Richtlijn | Voorbeeld |
|---------|------------|------------|
| **Toon** | Sportief, enthousiast, menselijk | „Klaar voor de aftrap? Maak in 2 klikken je video.” |
| **Taalniveau** | B1 – helder en actief | „Je club. Jouw stijl. Onze AI.” |
| **Ritme** | Korte zinnen, veel werkwoorden | „Upload. Genereer. Deel.” |
| **Perspectief** | Tweede persoon („je”, „jouw club”) | „We doen het samen.” |
| **Humor** | Licht en collegiaal, nooit flauw | „Van upload tot applaus in vijf minuten.” |
| **Focus** | Actie, trots en eenvoud | „Laat je club zien – elke week opnieuw.” |
| **Vermijd** | Technisch jargon, managementtaal | Niet: „AI-optimisatiepipeline”; wel: „AI die je video afmaakt.” |

### Tone by Context
| Domein | Stijl | Richtlijn |
|---------|-------|------------|
| **Businessplan** | Strategisch, inspirerend | Gebruik storytelling en visie, zonder te technisch te worden. |
| **Brand Identity** | Creatief, visueel | Korte zinnen, beeldend taalgebruik. |
| **Functional Design** | Helder, gebruikersgericht | Beschrijf flows als stappen met actiegerichte taal. |
| **Technical Design** | Zakelijk en precies | Actieve zinnen, maar neutrale toon. |
| **Project Plan** | Praktisch, motiverend | Duidelijk en resultaatgericht, alsof je team instrueert. |

---

## 💬 3. Kernboodschap (voor alle documenten)

> **„TeamReel maakt professionele clubvideo’s eenvoudig en leuk – in vijf minuten, in jouw stijl.”**

Gebruik dit als leidende boodschap in intro’s, samenvattingen of promotionele secties.

---

## ⚙️ 4. Consistentieprincipes
1. **Eén stem, meerdere lagen:** zelfde toon in documenten, UI en marketing.
2. **Actie boven uitleg:** beschrijf wat de gebruiker *doet*, niet wat de software *is*.
3. **Toegankelijk design:** contrast, leesbaarheid en B1-taalniveau zijn verplicht.
4. **Herbruikbare tokens:** kleuren, fonts en spacing komen altijd uit dezelfde bron (`/2_brand/assets/`).
5. **Iteratief onderhoud:** elke nieuwe module krijgt tokens + tone-check.
6. **Visuele consistentie:** logo’s, iconen en kleuren volgen de richtlijnen uit `brand_assets.md`.
7. **Dark/Light synchronisatie:** elke UI-component ondersteunt automatisch light- en darkmode.

---

## 🔁 5. Toepassing in Docs (Samenvatting)

| Document | Focus | Belangrijkste link met Style Foundation |
|-----------|--------|----------------------------------------|
| **Brand Identity** | Vorm en toon van merk | Gebruikt álle tokens en volledige tone set |
| **Businessplan** | Strategisch verhaal | Gebruikt tone + kernboodschap |
| **Functional Design** | UX en flow | Gebruikt layout- en typografietokens |
| **Technical Design** | Implementatie | Gebruikt kleuren/typografie als JSON export |
| **Project Plan** | Proces en prioriteiten | Gebruikt tone en visuele consistentie voor communicatiedocs |

---

## 🔗 Integratie met Frontend & AI
Design tokens worden automatisch gesynchroniseerd via een JSON-export naar:
- `/frontend/src/assets/tokens.json` voor Next.js
- `/n8n/flows/config/branding.json` voor AI-flows

> Hierdoor blijft elke AI-video, UI-component en webinterface visueel in lijn met de merkstijl.

---

## 🏁 Slot

Alle documenten — van Businessplan tot Technical Design — verwijzen naar deze Style Foundation als primaire bron voor toon, kleur en consistentie.
De *TeamReel Style Foundation* vormt het fundament van alle merk-, ontwerp- en ontwikkelactiviteiten.
Bij elke nieuwe module, campagne of UI-component geldt dit document als bron van waarheid.

> **Blijf trouw aan eenvoud, energie en trots – dat is de TeamReel-stijl.**
