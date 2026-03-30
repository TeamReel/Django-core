# 341-F29 — Home Page Premium Design

| | |
|---|---|
| Code | F29 |
| Status | ✅ DONE |
| Prioriteit | Hoog |
| Geschatte effort | ~14 uur |
| Afhankelijkheden | Geen |
| Doelgroep | Alle gebruikers |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie

De Home page (DashboardPage) is functioneel compleet maar voelt als een **admin-paneel** in plaats van een premium sport-app:

- **Geen visuele branding** — alleen tekst "Welkom, Brian" + organisatienaam, geen clublogo's
- **Flat card design** — minimale schaduwen, geen diepte, voelt als gratis tool
- **Geen team-imagery** — geen spelersfoto's, geen clublogo's bij wedstrijden
- **Gamification onderbenut** — streak widget staat laag, niet prominent
- **Geen content showcase** — pipeline toont alleen aantallen, niet de mooie output
- **Geen entrance-animatie** — cards verschijnen abrupt, geen polish
- **Matchday voelt niet speciaal** — kleine countdown badge ipv een epische hero

### 1.2 Gewenste situatie

Een Home page die gebruikers een **WOW-gevoel** geeft:

- Clublogo prominent in de header → directe teamidentiteit
- Logo's bij wedstrijden → voelt als FotMob/ESPN
- Hero banner met team branding
- Matchday hero mode — de app transformeert op wedstrijddag
- Content carousel — "kijk wat we gemaakt hebben!"
- Premium card styling — glassmorphism, shadows, micro-animaties
- Staggered fade-in — polish bij het laden

---

## 2. Fasering

| Fase | Titel | Effort | Omschrijving |
|------|-------|--------|-------------|
| H0 | Club branding & logo's | ~2 uur | Clublogo in header + bij wedstrijden |
| H1 | Hero banner | ~3 uur | Full-width hero met teamfoto/gradient + branding |
| H2 | Match Day hero mode | ~3 uur | Epische matchday transformatie met logo's + countdown |
| H3 | Content highlights carousel | ~2 uur | Swipeable thumbnails van gegenereerde content |
| H4 | Premium polish & animaties | ~4 uur | Card elevation, glassmorphism, streak prominent, fade-in |

---

## 3. Technische notities

- **Puur frontend** — geen backend wijzigingen nodig
- Clublogo's komen uit bestaande BrandProfile/Organisation API data
- Teamfoto uit `brand_assets.hero` of `brand_assets.team_photo` (bestaand)
- Content thumbnails uit bestaande content API (thumbnail URL in metadata)
- Tegenstander-logo uit match metadata (bestaand veld)
- Design tokens gebruiken — geen hardcoded kleuren
- Alle animaties respecteren `prefers-reduced-motion`
- Dark mode compatible

## 4. Acceptatiecriteria

- [x] Clublogo zichtbaar in header en bij wedstrijden
- [x] Hero banner met teamfoto of gradient fallback
- [x] Matchday mode met logo vs logo + countdown
- [x] Content carousel met laatste gegenereerde items
- [x] Premium card styling met diepte en animatie
- [x] WCAG 2.1 AA compliant (contrast, focus, reduced-motion)
- [x] Mobile-first, responsive tot desktop
