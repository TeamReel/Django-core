# TeamReel Functional Design

> Hoe gebruikers met TeamReel werken — modules, flows en schermen.

---

## 1. Gebruikersrollen

| Rol | Beschrijving | Voorbeeld acties |
|-----|-------------|------------------|
| **Vrijwilliger / Communicatiebeheerder** | Maakt en beheert clubcontent | Video genereren, berichten delen |
| **Trainer / Teammanager** | Voert wedstrijddata in | Uitslagen, spelers, opstellingen |
| **Clubbeheerder** | Beheert clubidentiteit | Templates aanpassen, gebruikers beheren |
| **Organisatie Admin** | Beheert meerdere clubs | Federatie-overzicht, rechten toekennen |

---

## 2. Platform Modules

### Dashboard
Overzicht van teams, wedstrijden en recente media. Toont club-statistieken en status van AI-output.
- **Route:** `/dashboard`
- **Multi-team:** `/my-teams` — overzicht wanneer gebruiker bij meerdere teams hoort

### Team Hub
Centrale pagina per team met hiërarchie: Federatie → Club → Team → Seizoen → Competitie → Wedstrijd.
- **Route:** `/:orgId/:clubId/:projectId`
- **Deep linking:** doorklikken naar seizoenen, competities en wedstrijden

### AI Studio
Start en beoordeel AI-generaties. Preview, feedback en download.
- **Route:** `/studio`
- **Content types:** line-up, match intro, goal celebration, then-vs-now, social media visuals

### Content & Mediabibliotheek
Alle gegenereerde en geüploade media op één doorzoekbare plek.
- **Routes:** `/content`, `/medialib`
- **Zoek en filter:** per type, datum, team, wedstrijd

### Teambeheer
Spelers, coaches en staf beheren. Bulk acties voor import/export.
- **Route:** via Team Hub → Members tab
- **Functies:** foto upload, sportdata (rugnummer, positie), batch operations

### Brand & Identity
Clubstijl instellen: kleuren, logo, kit images, typografie tokens.
- **Route:** via Settings → Brand tab
- **Output:** BrandProfile wordt gebruikt door alle content templates

### Wedstrijdbeheer
Wedstrijden aanmaken, uitslagen invoeren, opstellingen beheren.
- **Route:** via Team Hub → Matches
- **Flow:** Wedstrijd → Opstelling → AI content generatie

### Credits & Rapportage
Verbruik bijhouden, credit balance, transactiehistorie.
- **Route:** `/credits`
- **Inzicht:** per team, per type content, per periode

### Notificaties
Multi-channel notificaties met gebruikersvoorkeuren.
- **Route:** `/notifications`
- **Kanalen:** in-app, email (toekomst: push, WhatsApp)

### Goedkeuringen
Workflow-based approval voor gegenereerde content voor publicatie.
- **Route:** `/approvals`
- **Flow:** Content gegenereerd → Review → Goedkeuren/Afwijzen → Publiceren

---

## 3. Hoofdflow

```
Login → Dashboard → Selecteer Team → Selecteer Wedstrijd
    → Start AI Generatie → Preview in AI Studio
    → Feedback of Download → Delen op socials
```

### Wedstrijd-fase content

| Fase | Content type | Trigger |
|------|-------------|---------|
| **Pre-match** | Match aankondiging, opstelling | Wedstrijd aangemaakt + opstelling ingevuld |
| **During-match** | Doelpunt viering | Score update |
| **Post-match** | Uitslag graphic, highlights | Wedstrijd afgelopen |
| **Achtergrond** | Then-vs-now, seizoensoverzicht | Handmatig of periodiek |

---

## 4. Data Hiërarchie

```
Organisatie (federatie/bond)
 └─ Project (club — top-level)
     └─ Project (team — nested)
         ├─ Members (spelers, trainers, staf)
         ├─ BrandProfile (kleuren, logo, kits)
         └─ Period (seizoen)
             └─ Period (competitie)
                 └─ Activity (wedstrijd/training/event)
                     └─ ActivityParticipation (wie + welke rol)
```

---

## 5. Technische Referenties

| Onderwerp | Document |
|-----------|----------|
| Architectuur & models | [../architecture/overview.md](../architecture/overview.md) |
| Data model (67 tabellen) | [../architecture/data-model.md](../architecture/data-model.md) |
| API endpoints (~130) | [../features/api-reference.md](../features/api-reference.md) |
| Video pipeline | [../features/video-processing.md](../features/video-processing.md) |
| AI generation | [../features/generative-pipeline.md](../features/generative-pipeline.md) |
| Brand tokens | [../features/branding-tokens.md](../features/branding-tokens.md) |
| Frontend UX flows | [../frontend/ux-flows.md](../frontend/ux-flows.md) |
