# System Visualisatie

## Overzicht
Dit document biedt visuele schema's van de Django Core-App architectuur, bedoeld voor zowel technische als niet-technische stakeholders.

---

## 1. High-Level Architectuur: De 3 Lagen

```mermaid
graph TB
    subgraph "🌐 Browser (Gebruiker)"
        UI[React Frontend<br/>Design System + Auth UI]
    end

    subgraph "⚙️ Backend Server (Railway)"
        API[Django REST API<br/>Endpoints]
        LOGIC[Business Logic<br/>Accounts, Orgs, Projects]
        BG[Achtergrond Taken<br/>Celery]
    end

    subgraph "💾 Data & Services"
        DB[(PostgreSQL<br/>Database)]
        REDIS[(Redis<br/>Cache + Queue)]
    end

    UI -->|HTTPS Requests| API
    API -->|Leest/Schrijft| DB
    API -->|Cache + Jobs| REDIS
    BG -->|Verwerkt Jobs| REDIS
    BG -->|Stuurt Emails| DB
```

**Wat betekent dit?**
- **🌐 Browser**: Wat de gebruiker ziet (knoppen, formulieren, lijsten).
- **⚙️ Backend**: De "hersenen" die beslissingen nemen en data verwerken.
- **💾 Database**: Waar alle data permanent wordt opgeslagen (gebruikers, projecten, bestanden).

---

## 2. Data Hiërarchie: Wie Hoort Bij Wie?

```mermaid
graph TD
    USER[👤 User<br/>Email + Wachtwoord]
    ORG[🏢 Organisation<br/>Bedrijf/Team]
    PROJ[📁 Project<br/>Workspace]
    FILE[📎 File<br/>Upload]
    TASK[✅ Taak]

    USER -->|is lid van| ORG
    USER -->|werkt in| PROJ
    ORG -->|bevat| PROJ
    PROJ -->|bevat| FILE
    PROJ -->|bevat| TASK

    style USER fill:#e1f5ff
    style ORG fill:#fff4e1
    style PROJ fill:#e8f5e9
    style FILE fill:#f3e5f5
    style TASK fill:#fce4ec
```

**Voorbeeld (Voetbal Liga):**
- 👤 **User**: "Jan de Scheidsrechter"
- 🏢 **Organisation**: "Eredivisie"
- 📁 **Project**: "Seizoen 2025/2026"
- 📎 **File**: "Wedstrijdverslag Ajax-Feyenoord.pdf"

### 2.1 Permissions Hierarchy

```mermaid
graph TB
    SUPER[🔴 Superuser<br/>Platform Admin]
    ORG_ADMIN[🟡 Org Admin<br/>Volledige Org Toegang]
    ORG_MEMBER[🟢 Org Member<br/>Basis Toegang]
    PROJ_ADMIN[🔵 Project Admin<br/>Project Beheer]
    PROJ_EDITOR[🟣 Project Editor<br/>Kan Bewerken]
    PROJ_VIEWER[⚪ Project Viewer<br/>Alleen Lezen]

    SUPER -->|kan alles| ORG_ADMIN
    ORG_ADMIN -->|beheert| ORG_MEMBER
    ORG_ADMIN -->|implicit toegang| PROJ_ADMIN
    PROJ_ADMIN --> PROJ_EDITOR
    PROJ_EDITOR --> PROJ_VIEWER

    style SUPER fill:#ff6b6b
    style ORG_ADMIN fill:#ffd93d
    style ORG_MEMBER fill:#6bcf7f
    style PROJ_ADMIN fill:#4d96ff
    style PROJ_EDITOR fill:#a78bfa
    style PROJ_VIEWER fill:#e5e5e5
```

**Rechten Overzicht:**
- 🔴 **Superuser**: Ziet alles, kan alles. Bedoeld voor platform onderhoud.
- 🟡 **Org Admin**: Volledige controle over 1 organisatie. Kan projecten aanmaken, leden uitnodigen.
- 🟢 **Org Member**: Basis toegang. Kan projecten zien (tenzij private).
- 🔵 **Project Admin**: Kan project settings wijzigen, leden toevoegen.
- 🟣 **Project Editor**: Kan bestanden uploaden, taken aanmaken.
- ⚪ **Project Viewer**: Alleen lezen, geen wijzigingen.

---

## 3. Wat Gebeurt Er Bij Login?

```mermaid
sequenceDiagram
    actor User as 👤 Gebruiker
    participant UI as 🌐 Login Pagina
    participant API as ⚙️ Backend API
    participant DB as 💾 Database
    participant AUDIT as 📝 Audit Log

    User->>UI: Typt email + wachtwoord
    UI->>API: POST /api/auth/login/
    API->>DB: Controleer wachtwoord
    DB-->>API: ✅ Correct
    API->>AUDIT: Log "user.login"
    API-->>UI: 🔑 Session Cookie
    UI-->>User: Doorsturen naar Dashboard
```

**Stap-voor-stap:**
1. Gebruiker typt inloggegevens.
2. Frontend stuurt verzoek naar Backend.
3. Backend checkt wachtwoord in Database.
4. Als correct: maak sessie aan.
5. Alles wordt gelogd voor beveiliging.

---

## 4. Wat Gebeurt Er Bij Bestand Uploaden?

```mermaid
sequenceDiagram
    actor User as 👤 Gebruiker
    participant UI as 🌐 Upload Knop
    participant API as ⚙️ Backend API
    participant STORAGE as ☁️ File Storage
    participant DB as 💾 Database
    participant WORKER as 🤖 Celery Worker

    User->>UI: Selecteert bestand
    UI->>API: POST /api/files/upload/
    API->>STORAGE: Upload binary data
    STORAGE-->>API: ✅ storage_path
    API->>DB: Sla metadata op
    API->>WORKER: 🔔 Maak thumbnail
    API-->>UI: ✅ Upload succesvol
    WORKER->>STORAGE: Genereer thumbnail
    WORKER->>DB: Update thumbnail_path
```

**Stap-voor-stap:**
1. Gebruiker klikt "Upload" en kiest bestand.
2. Backend slaat bestand op in Cloud Storage (S3/R2).
3. Metadata (naam, grootte, type) gaat naar Database.
4. **Achtergrond taak** maakt thumbnail (zodat pagina niet "bevriest").
5. Thumbnail wordt later toegevoegd.

---

## 5. Feature Capabilities Overzicht

### 5.1 Dark/Light Mode (Theming)

```mermaid
graph LR
    USER[👤 Gebruiker]
    TOGGLE[🌓 Theme Toggle<br/>F01 Design System]
    ORG_SET[⚙️ Org Setting<br/>enable_theme_toggle]
    USER_PREF[💾 User Preference<br/>B12 I18n]
    CSS[🎨 CSS Variables<br/>--color-primary]

    USER -->|klikt toggle| TOGGLE
    TOGGLE -->|check| ORG_SET
    ORG_SET -->|allowed?| USER_PREF
    USER_PREF -->|save| CSS
    CSS -->|updates| USER

    style TOGGLE fill:#ffd93d
    style USER_PREF fill:#a78bfa
    style CSS fill:#6bcf7f
```

**Hoe het werkt:**
1. Gebruiker klikt op 🌓 toggle in de UI (F01 Design System).
2. Check of `Organisation.enable_theme_toggle = True`.
3. Sla voorkeur op in `B12 I18n Preferences`.
4. Update CSS custom properties (`--color-primary`, `--bg-color`, etc.).
5. Alle componenten gebruiken deze variabelen en updaten automatisch.

### 5.2 Credits & Usage Tracking

```mermaid
sequenceDiagram
    actor User as 👤 Gebruiker
    participant API as ⚙️ Backend API
    participant USAGE as 📊 UsageEvent
    participant TXN as 💰 Transaction
    participant BAL as 💳 Balance
    participant POLICY as 📜 Policy

    User->>API: Upload bestand (5MB)
    API->>POLICY: Check allow_negative?
    POLICY-->>API: ✅ Prepaid (block at 0)
    API->>BAL: Check balance ≥ 50?
    BAL-->>API: ✅ Balance = 100
    API->>USAGE: Record event (file.upload, 5MB)
    API->>TXN: Create transaction (-50)
    TXN->>BAL: Update balance (100 → 50)
    API-->>User: ✅ Upload succesvol

    Note over USAGE,TXN: Immutable ledger<br/>Idempotency via key
```

**Transactie Flow:**
1. **Check Policy**: Is negatief toegestaan? (Prepaid vs Postpaid)
2. **Check Balance**: Genoeg credits?
3. **Record Usage**: Log de actie in `UsageEvent`.
4. **Create Transaction**: Voeg transactie toe aan ledger (signed amount).
5. **Update Balance**: Trek credits af van `CreditsBalance`.

### 5.3 Notificatie Delivery Pipeline

```mermaid
graph TB
    TRIGGER[🔔 Trigger Event<br/>"File uploaded"]
    TYPE[📋 NotificationType<br/>default/password_reset]
    CHANNEL{📡 Channel?}
    EMAIL[📧 Email<br/>Celery Task]
    INAPP[📱 In-App<br/>DB Record]
    WEBHOOK[🔗 Webhook<br/>HTTP POST]
    RETRY[🔄 Retry Policy<br/>3x with backoff]

    TRIGGER --> TYPE
    TYPE --> CHANNEL
    CHANNEL -->|email| EMAIL
    CHANNEL -->|in_app| INAPP
    CHANNEL -->|webhook| WEBHOOK
    EMAIL --> RETRY
    WEBHOOK --> RETRY
    RETRY -->|failed 3x| INAPP

    style TRIGGER fill:#ffd93d
    style EMAIL fill:#ff6b6b
    style INAPP fill:#6bcf7f
    style WEBHOOK fill:#4d96ff
```

**Notification Flow:**
1. Trigger event (file upload, comment, etc.).
2. Lookup `NotificationType` (heeft default channel).
3. Route naar channel: Email, In-App, of Webhook.
4. Email/Webhook: Async via Celery met retry policy.
5. In-App: Direct opslaan in DB, verschijnt in F04 Notification Hub.
6. Failed deliveries: Fallback naar In-App.

### 5.4 Search Ranking & Filtering

```mermaid
graph LR
    QUERY[🔍 Search Query<br/>"Ajax wedstrijd"]
    INDEX[📚 FTS Index<br/>PostgreSQL]
    RANK[📊 Ranking<br/>ts_rank]
    FILTER[🔒 Access Filter<br/>Permissions]
    RESULTS[📝 Results<br/>Sorted]

    QUERY --> INDEX
    INDEX --> RANK
    RANK --> FILTER
    FILTER --> RESULTS

    style QUERY fill:#ffd93d
    style RANK fill:#a78bfa
    style FILTER fill:#ff6b6b
    style RESULTS fill:#6bcf7f
```

**Search Process:**
1. Query komt binnen (`/api/search/?q=keyword`).
2. PostgreSQL Full-Text Search (B24) zoekt in index.
3. Ranking op basis van relevance (`ts_rank`).
4. **Permissions Filter (B08)**: Verwijder results waar user geen toegang tot heeft.
5. Return sorted results.

---

## 6. De Volledige Module Kaart

```mermaid
graph LR
    subgraph "� Security Layer"
        B03[B03: Security<br/>CSP + Headers]
    end

    subgraph "👤 Identity & Toegang"
        B05[B05: Accounts<br/>Login/Register]
        B06[B06: Organisations<br/>Multi-tenancy]
        B07[B07: Projects<br/>Workspaces]
        B08[B08: Permissions<br/>RBAC]
    end

    subgraph "🔒 Beveiliging & Monitoring"
        B09[B09: Audit<br/>Activiteiten Log]
        B18[B18: Observability<br/>Health Checks]
    end

    subgraph "⚙️ Systeem Services"
        B10[B10: Settings<br/>Configuratie]
        B12[B12: I18n<br/>Taal Voorkeuren]
        B15[B15: Tasks<br/>Achtergrond Jobs]
        B16[B16: Notifications<br/>Email + In-App]
        B17[B17: Contextual<br/>Real-time Alerts]
    end

    subgraph "💰 Billing & Usage"
        B11[B11: Transactions<br/>Credits & Ledger]
    end

    subgraph "📦 Data & Bestanden"
        B22[B22: Files<br/>Uploads]
        B24[B24: Search<br/>Full-Text]
    end

    subgraph "🎨 Frontend (React)"
        F01[F01: Design System]
        F02[F02: Auth UI]
        F03[F03: Context Switcher]
        F04[F04: Notifications Hub]
    end

    B03 -.->|beschermt| B05
    B03 -.->|beschermt| B06
    B05 --> B06
    B06 --> B07
    B08 --> B07
    B09 -.->|logs alles| B05
    B09 -.->|logs alles| B06
    B09 -.->|logs alles| B07
    B09 -.->|logs alles| B11
    B10 --> B12
    B15 --> B16
    B16 --> B17
    B07 --> B22
    B07 --> B11
    B22 --> B24
    B07 --> B24

    F02 --> B05
    F03 --> B06
    F03 --> B07
    F04 --> B16
    F04 --> B17
    F01 --> F02
    F01 --> F03
    F01 --> F04

    style B03 fill:#ff6b6b
    style B05 fill:#e3f2fd
    style B06 fill:#e3f2fd
    style B07 fill:#e3f2fd
    style B08 fill:#e3f2fd
    style B09 fill:#fff3e0
    style B18 fill:#fff3e0
    style B10 fill:#f3e5f5
    style B12 fill:#f3e5f5
    style B15 fill:#f3e5f5
    style B16 fill:#f3e5f5
    style B17 fill:#f3e5f5
    style B11 fill:#fff9c4
    style B22 fill:#e8f5e9
    style B24 fill:#e8f5e9
    style F01 fill:#fce4ec
    style F02 fill:#fce4ec
    style F03 fill:#fce4ec
    style F04 fill:#fce4ec
```

**Legenda:**
- **Rode vakken**: Security laag (beschermt alles)
- **Blauwe vakken**: Wie heeft toegang?
- **Oranje vakken**: Wat wordt gelogd en gemonitord?
- **Paarse vakken**: Hoe werkt het systeem?
- **Gele vakken**: Billing en usage tracking
- **Groene vakken**: Waar is de data?
- **Roze vakken**: Wat ziet de gebruiker?

---

## 7. Deployment: Hoe Draait Het In Productie?

```mermaid
graph TB
    subgraph "🌍 Internet"
        USER[👥 Gebruikers]
    end

    subgraph "☁️ Railway (Cloud Platform)"
        NGINX[Nginx<br/>Reverse Proxy]
        WEB[Django Web<br/>Gunicorn]
        BEAT[Celery Beat<br/>Scheduler]
        WORKER[Celery Worker<br/>Achtergrond]

        DB[(PostgreSQL<br/>Database)]
        REDIS[(Redis<br/>Cache)]
    end

    USER -->|HTTPS| NGINX
    NGINX --> WEB
    WEB --> DB
    WEB --> REDIS
    BEAT --> REDIS
    WORKER --> REDIS
    WORKER --> DB

    style NGINX fill:#4caf50
    style WEB fill:#2196f3
    style BEAT fill:#ff9800
    style WORKER fill:#ff9800
    style DB fill:#9c27b0
    style REDIS fill:#f44336
```

**Wat betekent dit?**
- **Nginx**: "Portier" die requests ontvangt en doorstuurt.
- **Django Web**: Verwerkt pagina's en API requests.
- **Celery Beat**: "Wekker" die elke 10 minuten taken start.
- **Celery Worker**: Voert zware taken uit (emails, thumbnails).
- **PostgreSQL**: De "kluis" met alle data.
- **Redis**: "Snelle plank" voor tijdelijke data en job queue.

---

## 8. Typische Gebruikers Journey

```mermaid
journey
    title Een Manager Maakt Een Nieuw Project
    section Login
      Open website: 5: Manager
      Typ inloggegevens: 4: Manager
      Klik "Inloggen": 5: Manager
    section Navigatie
      Zie dashboard: 5: Manager
      Klik organisatie dropdown: 4: Manager
      Selecteer "Eredivisie": 5: Manager
    section Project Aanmaken
      Klik "Nieuw Project": 5: Manager
      Typ "Seizoen 2026": 4: Manager
      Upload logo: 3: Manager
      Klik "Opslaan": 5: Manager
    section Resultaat
      Zie succesbericht: 5: Manager
      Project verschijnt in lijst: 5: Manager
```

**Score Legenda:**
- 5 = 😄 Makkelijk
- 3 = 😐 Neutraal
- 1 = 😞 Moeilijk

---

## 9. Wat Komt Er Nog? (Roadmap)

### 🚧 In Ontwikkeling

```mermaid
graph LR
    subgraph "✅ Klaar (Phase 1-8)"
        DONE1[B05: Auth]
        DONE2[B06: Orgs]
        DONE3[B22: Files]
        DONE4[F01: Design]
    end

    subgraph "🚧 In Progress (Phase 9)"
        WIP1[B23: WebSockets<br/>Real-time]
        WIP2[B24: Search<br/>Full-Text]
    end

    subgraph "📋 Gepland (Phase 10-12)"
        PLAN1[Workflows<br/>State Machines]
        PLAN2[Payments<br/>Stripe Integration]
        PLAN3[Advanced Forms<br/>Dynamic Builder]
        PLAN4[Reporting<br/>Analytics Dashboard]
    end

    subgraph "🔮 Toekomst (Phase 13-15)"
        FUT1[Data Platform<br/>ETL Pipeline]
        FUT2[ML/AI Platform<br/>Model Registry]
        FUT3[Agents<br/>LLM Integration]
    end

    DONE1 --> WIP1
    DONE2 --> WIP1
    WIP1 --> PLAN1
    WIP2 --> PLAN1
    PLAN2 --> FUT1
    PLAN3 --> FUT2

    style DONE1 fill:#6bcf7f
    style DONE2 fill:#6bcf7f
    style DONE3 fill:#6bcf7f
    style DONE4 fill:#6bcf7f
    style WIP1 fill:#ffd93d
    style WIP2 fill:#ffd93d
    style PLAN1 fill:#a78bfa
    style PLAN2 fill:#a78bfa
    style PLAN3 fill:#a78bfa
    style PLAN4 fill:#a78bfa
    style FUT1 fill:#e5e5e5
    style FUT2 fill:#e5e5e5
    style FUT3 fill:#e5e5e5
```

### 🚧 Phase 9: Backend Infrastructure (Q1 2026)

**B23: Real-time Infrastructure (WebSockets)**
- Live notificaties zonder pagina refresh
- Real-time collaboration ("User X is typing...")
- Django Channels + Redis

**B24: Full-Text Search (In Progress)**
- Zoeken over Projects, Files, Comments
- Elasticsearch migratie (nu: PostgreSQL FTS)
- Faceted search (filter op type, datum, owner)

### 📋 Phase 10-12: Advanced Features (Q2-Q3 2026)

**Workflows & State Machines**
- Approval flows ("Manager moet goedkeuren")
- Custom pipelines per Organisatie
- Audit trail per workflow step

**Payment Integration**
- Stripe checkout
- Subscription management
- Invoice generation

**Advanced Forms**
- Drag-and-drop form builder
- Conditional logic ("Toon veld X als Y = Z")
- Form versioning

**Reporting & Analytics**
- Pre-built dashboards (usage, costs, activity)
- Export naar PDF/Excel
- Scheduled reports via email

### 🔮 Phase 13-15: Data & AI Platform (Q4 2026+)

**Data Foundations**
- ETL pipeline voor data aggregatie
- Data lineage tracking
- Data validation rules

**ML/AI Platform**
- Model training infrastructure
- Feature engineering pipeline
- A/B testing framework

**AI Agents**
- LLM integration (OpenAI, Anthropic)
- Custom AI assistants per Organisatie
- Retrieval-Augmented Generation (RAG)

### ⏳ Tijdlijn

```mermaid
gantt
    title Development Roadmap 2026
    dateFormat YYYY-MM
    section Phase 9
    WebSockets         :2026-01, 2026-03
    Search Enhancement :2026-01, 2026-02
    section Phase 10-12
    Workflows          :2026-04, 2026-06
    Payments           :2026-05, 2026-07
    Forms              :2026-06, 2026-08
    Reporting          :2026-07, 2026-09
    section Phase 13-15
    Data Platform      :2026-10, 2026-12
    ML Platform        :2026-11, 2027-01
    AI Agents          :2027-01, 2027-03
```

---

## 10. Veelgestelde Vragen (Non-Technical)

### "Waar staat mijn data?"
Op **Railway's PostgreSQL servers** in de cloud. Dit wordt automatisch elke dag gebackupt.

### "Wat gebeurt er als de server crasht?"
Railway detecteert dit binnen 30 seconden en start automatisch een nieuwe server op. Data blijft behouden.

### "Kan ik zien wie wat heeft gedaan?"
Ja! **B09 Audit Logging** slaat elke belangrijke actie op (wie, wat, wanneer). Dit is onveranderbaar voor compliance.

### "Hoe werkt de billing/credits?"
**B11 Transactions** houdt bij hoeveel credits een Organisatie heeft en trekt credits af bij gebruik (file uploads, API calls, etc.). Het systeem kan voorkomen dat gebruikers acties uitvoeren als credits op zijn (prepaid) of negatief laten gaan (postpaid).

### "Kunnen verschillende teams verschillende rechten hebben?"
Ja! **B08 Permissions** biedt Role-Based Access Control (RBAC). Je kunt rollen toekennen op 3 niveaus:
- **Global**: Platform administrators
- **Organisation**: Organisatie admins en members
- **Project**: Project-specifieke rechten (viewer, editor, admin)

### "Hoeveel gebruikers kan het aan?"
De huidige setup ondersteunt **~1000 gelijktijdige gebruikers**. Bij groei kan Railway automatisch opschalen.

### "Is het veilig?"
Ja! **B03 Security Baseline** zorgt voor:
- ✅ HTTPS (versleutelde verbinding)
- ✅ CSP (Content Security Policy tegen XSS)
- ✅ CSRF bescherming (geen kwaadaardige requests)
- ✅ Password hashing (wachtwoorden zijn niet leesbaar)
- ✅ Security headers (HSTS, X-Frame-Options)
- ✅ Audit logs (alles wordt geregistreerd)

---

## Bronnen
- Technische details: [architecture.md](architecture.md)
- Module overzicht: [../04-modules/index.md](../04-modules/index.md)
- Railway setup: [../07-operations/railway-integration.md](../07-operations/railway-integration.md)
