# 337-F25 — Club Hub: centrale beheerpagina voor de club

| | |
|---|---|
| Code | F25 |
| Status | 📋 ROADMAP |
| Prioriteit | Medium |
| Geschatte effort | ~20 uur |
| Afhankelijkheden | F24 (done) — `TeamSwitcher`, 3-seg URL structuur, `ClubAssetsSection` component |
| Doelgroep | Club Admin |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie na F24

Na F24 heeft elk team een eigen hub op `/:org/:club/:team`. Club assets zijn beheerbaar via de Assets tab van een team (zichtbaar voor club admins). Maar er is geen centraal punt voor de **club als geheel**:

| Behoefte | Nu | Gewenst |
|---------|-----|---------|
| Overzicht van alle teams in de club | Niet beschikbaar | Club Hub overview |
| Club assets beheren (logo, kit, sponsor, locatie) | Verscholen in team hub Assets tab | Eigen sectie op Club Hub |
| Club-niveau leden beheren | Niet beschikbaar | Club Hub Leden tab |
| Club-brede content/seizoenen overzicht | Niet beschikbaar | Club Hub Overview |
| Navigatie van club naar team | Alleen via directe URL of TeamSwitcher | Club Hub → team kaarten |

### 1.2 Relatie tot F24

F24 löst het probleem op **team-niveau**. F25 biedt hetzelfde op **club-niveau**. Gedeelde componenten:

| F24 component | Gebruik in F25 |
|--------------|---------------|
| `ClubAssetsSection` | Hergebruikt 1-op-1 op Club Hub Assets tab |
| `TeamSwitcher` | Verplaatst naar Club Hub header als primaire team-navigatie |
| `SeasonSwitcher` | Niet van toepassing op club-niveau |
| `navigateToTab()` helper | Hergebruikt in Club Hub tabs |

**Geen duplicatie**: club assets worden beheerd op één plek. Keuze: Club Hub wordt de canonical plaats voor club asset beheer (niet de team hub). De Assets tab op de team hub toont club assets read-only voor team admins en linkt naar de Club Hub voor bewerken.

### 1.3 Route structuur

```
/:org/:club                  → ClubHubPage (nieuw — F25)
/:org/:club/:team            → MyTeamHubPage (F24)
/:org/:club/:team/members/   → MemberDetailPage
```

De club-route bestaat al als `/:orgId/:clubId` maar rendert vermoedelijk een redirect of een basis club-profiel. F25 bouwt dit uit tot een volwaardige hub.

---

## 2. Domeinmodel (club-niveau)

```
Project (club, parent_project=None)
├── BrandProfile → BrandAsset (logo, sponsor, alle kits, locatie, club_background)
├── ProjectMembership (club-admin, club-viewer)
└── Project[] (teams, parent_project=club)
    └── elk team heeft eigen hub (F24)
```

**Club assets zijn eigendom van de club** — teams kunnen overriden (F24), maar de bron is altijd de club BrandProfile.

---

## 3. Gewenste pagina-structuur

### Tabs

| Tab | Zichtbaar voor | Inhoud |
|-----|---------------|--------|
| **Overview** | Alle rollen | Teamsoverzicht (kaarten), club assets samenvatting, quick links |
| **Teams** | Alle rollen | Alle teams van de club met status + navigatie naar team hub |
| **Assets** | Club admin (edit), anderen read-only | Club BrandProfile assets — hergebruikt `ClubAssetsSection` 1-op-1 |
| **Leden** | Club admin | Club-niveau leden (ProjectMembership zonder period) |
| **Beheer** | Club admin | Club instellingen, credits, branding configuratie |

### Header (consistent met Team Hub)

- Club naam + logo
- Geen SeasonSwitcher (club is tijdloos)
- Overflow menu: "Bewerken" (club-instellingen), "Bekijken" (publiek profiel), "Delen"

---

## 4. Consistentie-principes (geen duplicatie, modulair)

### Assets: één canonical locatie

| Scenario | Gedrag |
|---------|--------|
| Club admin beheert club logo | → Club Hub Assets tab (`ClubAssetsSection`) |
| Team admin bekijkt club logo op team hub | → Read-only in Assets tab, link "Beheer via Club Hub →" |
| Club admin beheert team kit-override | → Team Hub Assets tab (TeamAssetsSection) |

De `ClubAssetsSection` component (gebouwd in F24) wordt **zonder wijzigingen** hergebruikt op de Club Hub Assets tab. Geen tweede implementatie.

### TeamSwitcher: migratiepad

In F24 staat de `TeamSwitcher` op de **team hub** (club admins kunnen wisselen binnen de hub). Na F25 is de **Club Hub** de primaire plek voor team-navigatie. Het patroon:
- Club Hub: team-kaarten + klik → navigeer naar team hub
- Team Hub header: `TeamSwitcher` blijft staan (snelle wissel zonder terug naar club hub)
- Beide werken via dezelfde `setActiveContext('team', id)` + `navigate()` flow

### Gedeelde componenten — geen opnieuw bouwen

| Component | Gebouwd in | Hergebruik in F25 |
|----------|-----------|-----------------|
| `ClubAssetsSection` | F24 H3 | Club Hub Assets tab (ongewijzigd) |
| `TeamSwitcher` | F24 H4 | Club Hub header (als compacte teamlijst) |
| `navigateToTab()` | F24 | Club Hub tabs |
| `MemberPhotosSection` struct | F24 H3 | Club Hub Leden tab (zelfde patroon) |

---

## 5. Fasering (nader uit te werken in READY-fase)

| Fase | Naam | Effort |
|------|------|--------|
| H0 | Route + ClubHubPage scaffold | ~3 uur |
| H1 | Overview tab + Teams overzicht | ~4 uur |
| H2 | Assets tab (hergebruik ClubAssetsSection) | ~2 uur |
| H3 | Leden tab | ~5 uur |
| H4 | Beheer tab + polish | ~4 uur |
| H5 | A11y, E2E, docs | ~2 uur |
| **Totaal** | | **~20 uur** |

---

## 6. Acceptatiecriteria (globaal)

- [ ] `/:org/:club` → Club Hub laadt correct
- [ ] Teams tab: alle teams van de club zichtbaar als kaarten; klik → navigeer naar team hub
- [ ] Assets tab: hergebruikt `ClubAssetsSection` zonder duplicatie
- [ ] Club admin: edit knoppen actief op Assets tab
- [ ] Team hub Assets tab: club assets read-only na F25 (link naar Club Hub voor bewerken)
- [ ] Geen dubbele implementatie van club asset beheer
- [ ] `TeamSwitcher` werkt zowel op team hub als via Club Hub team-kaarten
- [ ] Alle semantische tokens (`var(--app-*)`) — geen primitives
- [ ] Max 500 regels per TSX bestand
- [ ] WCAG 2.1 AA
- [ ] Mobile responsive (375px–1280px)
