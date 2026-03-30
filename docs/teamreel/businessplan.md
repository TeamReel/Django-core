# TeamReel Businessplan

> Van vrijwilligers naar verhalenmakers — TeamReel maakt trots zichtbaar.

---

## 1. Visie

TeamReel verandert de manier waarop sportclubs communiceren. Met AI kunnen vrijwilligers in minuten professionele video's en visuals maken — volledig in de clubstijl. Wat vroeger uren kostte, gebeurt nu automatisch, zonder technische kennis.

**Kernboodschap:** Iedere club verdient professionele content, zonder gedoe.

---

## 2. Probleem en Kans

| Uitdaging | Huidige situatie | Kans |
|-----------|------------------|------|
| **Tijdgebrek** | Vrijwilligers besteden veel tijd aan communicatie | Automatisering via AI bespaart uren per week |
| **Designkennis ontbreekt** | Clubs missen tools voor visuele kwaliteit | TeamReel zorgt voor consistente, professionele content |
| **Schaalbaarheid** | Grote clubs kunnen investeren, kleine niet | SaaS-model maakt kwaliteit bereikbaar voor iedereen |

---

## 3. Product

Een platform waarmee clubs AI-content genereren in hun eigen stijl.

**Functies:**
- **Content Generator** — automatische video- en beeldcreatie (pre-, tijdens- en postwedstrijd)
- **Brand Engine** — volledige personalisatie in clubkleuren, logo en typografie
- **AI Studio** — preview, goedkeuring en feedback op gegenereerde content
- **Dashboard** — overzicht van teams, wedstrijden, media en statistieken
- **Contentbibliotheek** — alle gegenereerde media op één doorzoekbare plek
- **Credits & Rapportage** — transparant verbruik en inzicht in AI-prestaties

---

## 4. Doelgroep

| Segment | Kenmerk | Potentie |
|---------|---------|----------|
| **Voetbalverenigingen** | 3.000+ clubs, 1 miljoen leden in NL | Eerste en grootste doelgroep |
| **Andere sporten** | Hockey, volleybal, handbal, basketbal | Fase 2 van groei |
| **Internationaal** | DACH, UK, Scandinavië | Schaalvergroting vanaf 2026 |

**Gebruikersrollen:**
- **Vrijwilliger / Communicatiebeheerder** — maakt en beheert clubcontent
- **Trainer / Teammanager** — voert wedstrijddata en opstellingen in
- **Clubbeheerder** — stelt clubstijl, logo en kleuren in

---

## 5. Verdienmodel

TeamReel werkt als **SaaS**. Clubs betalen via abonnement of credits, sponsors kunnen branded templates inkopen.

| Segment | Model | Indicatie |
|---------|-------|-----------|
| Kleine club | Abonnement | €10–€20/maand |
| Vereniging met meerdere teams | Bundel | €100–€300/maand |
| Partners / Bonden | Whitelabel / API-integratie | Op maat |

---

## 6. Technologie

TeamReel is gebouwd op het **80/20 Core Platform** — een productieklare Django+React foundation.

**Wat het core platform levert (80%):**
- Multi-tenant organisatie/project hiërarchie met RBAC
- Bestandsbeheer en S3 opslag
- AI generation request/result pipeline
- Video job processing infrastructure
- Notificaties met gebruikersvoorkeuren
- Background task execution (Celery)
- Authenticatie, permissies, audit trail

**Wat TeamReel toevoegt (20%):**
- Sport-specifieke data models (members, activities, periods, competitions)
- Brand identity system (BrandProfile, BrandAsset)
- Content templates en generation types
- Video compositie (FFmpeg: line-ups, match intros, highlights)

Meer details: [technical-design.md](technical-design.md)

---

## 7. Groeistrategie

| Fase | Periode | Doel |
|------|---------|------|
| **MVP & Testclubs** | Q4 2025 – Q1 2026 | Werkend platform met eerste testclubs |
| **Multisport-uitbreiding** | Q2 – Q3 2026 | Nieuwe sporten, UI-verbetering |
| **Schaalvergroting** | Q4 2026 – Q2 2027 | Internationalisatie, meertaligheid |
| **Nieuwe modules** | Vanaf Q3 2027 | Externe data scraping, sponsor management, public feeds |

---

## 8. Concurrentepositie

| Concurrent | Aanpak | TeamReel verschil |
|-----------|--------|-------------------|
| Canva | Generieke templates | TeamReel is sport-specifiek met clubbinding |
| Videoland/Clipchamp | Handmatig bewerken | TeamReel genereert automatisch |
| Sportpress/AllUnited | Clubadministratie | TeamReel focust op content, niet administratie |

**Unieke positie:** TeamReel combineert clubidentiteit + AI-generatie + sportdata in één platform.
