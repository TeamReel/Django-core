# 🧭 TeamReel System Map

> **Eén ecosysteem – van clubdata tot AI-content.**

---

## 1. Doel van dit document
De *TeamReel System Map* geeft een overzicht van alle systeemonderdelen, hun interacties en de datastromen daartussen.
Het dient als visueel startpunt voor samenwerking, onboarding en technische besluitvorming.

> **Kernboodschap:** *TeamReel is ontworpen als één samenhangend geheel – overzichtelijk, schaalbaar en herkenbaar.*

---

## 2. Hoofdoverzicht

```mermaid
flowchart LR
    subgraph UI["Frontend – Next.js + Tailwind"]
        A1[Dashboard] --> A2[AI Studio]
        A2 --> A3[User Settings]
    end

    subgraph API["Backend – Django REST Framework"]
        B1[Auth & Roles]
        B2[Teams & Clubs]
        B3[Content & Credits]
        B4[Reports]
    end

    subgraph AI["AI Layer – LangGraph + OpenAI"]
        C1["Prompt Engine"]
        C2["Generation: Visual and Video"]
        C3["Validation Layer"]
    end

    subgraph DATA["Database & Storage"]
        D1["PostgreSQL – Structured Data"]
        D2["S3 or Railway – Assets"]
    end

    subgraph MON["Monitoring & CI/CD"]
        E1["GitHub Actions"]
        E2["Grafana and Sentry"]
    end

    UI -->|API Calls| API
    API -->|Data JSON| UI
    API -->|Request to AI| AI
    AI -->|"Result: Visual or Video"| API
    API -->|"Storage Input/Output"| DATA
    DATA -->|"Media URL"| UI
    API -->|"Logs and Metrics"| MON
```

> **Kernboodschap:** *Alles is verbonden – elke laag versterkt de volgende.*

---

## 3. Beschrijving per systeemlaag

| Laag | Technologie | Functie | Verantwoordelijkheden |
|------|--------------|----------|-----------------------|
| **Frontend** | Next.js, Tailwind, Tokens | Gebruikersinterface, interactie en visuele output. | Dashboard, AI Studio, instellingen. |
| **Backend / API** | Django REST Framework | Datamanagement, authenticatie, credits en AI-communicatie. | API-routes, logica en CI/CD. |
| **AI Layer** | LangGraph + OpenAI API | Verwerking van prompts, contentgeneratie en validatie. | AI-workflows en feedbackloops. |
| **Database & Storage** | PostgreSQL + S3 / Railway | Persistente opslag van data en media. | Clubs, teams, spelers, assets. |
| **Monitoring & Infra** | GitHub Actions, Grafana, Sentry | CI/CD, testresultaten en performancebewaking. | Incidentbeheer en kwaliteitscontrole. |

> **Kernboodschap:** *Elke laag is autonoom, maar afgestemd op dezelfde standaard.*

---

## 4. Datastroom in het kort

1. Gebruiker logt in via de frontend (Magic Link).
2. Frontend haalt team- en clubdata op via API.
3. Gebruiker start een AI-flow → backend verstuurt data naar de AI-engine.
4. AI genereert content, valideert kleuren en logo’s en stuurt terug.
5. Resultaat wordt opgeslagen in S3 en getoond in de AI Studio.
6. Gebruiker keurt goed of vraagt hergeneratie.
7. Logging, metrieken en changelogs worden automatisch bijgewerkt.

> **Kernboodschap:** *De gebruiker staat centraal – de techniek ondersteunt, de AI levert.*

---

## 5. Samenhang met andere documenten

| Document | Relatie |
|-----------|----------|
| **Technical Design** | Beschrijft de interne werking van elke laag. |
| **Blauwdruk** | Diepere uitleg van AI-workflows en datamodel. |
| **Functional Design** | Gebruikersflows en UI-logica. |
| **Projectplan** | Fases, releases en implementatievolgorde. |
| **AI Prompt Library** | De bouwstenen van de AI-laag. |

> **Kernboodschap:** *De System Map is het visuele ankerpunt van alle TeamReel-documentatie.*
