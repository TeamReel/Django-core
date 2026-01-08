# 🚀 Deployment Guide – TeamReel

> **Van code naar productie – veilig, automatisch en herhaalbaar.**

---

## 1. Doel van dit document
Deze handleiding beschrijft hoe **TeamReel** wordt geïnstalleerd, getest en online gezet.
De nadruk ligt op eenvoud, betrouwbaarheid en herhaalbaarheid.
Deployment verloopt via **GitHub Actions** (voor CI/CD) en **Railway.app** (voor hosting).

> **Kernboodschap:** *Deployment moet voorspelbaar zijn – geen handwerk, maar routine.*

---

## 2. Architectuur in het kort

| Component | Technologie | Doel |
|------------|--------------|------|
| **Frontend** | Next.js (React) | Gebruikersinterface |
| **Backend** | Django REST Framework | API, datamodel en logica |
| **Database** | PostgreSQL | Persistentie van data |
| **AI-engine** | LangGraph + OpenAI | AI-workflows |
| **CI/CD-pipeline** | GitHub Actions | Automatische builds en tests |
| **Hosting** | Railway.app | Productieomgeving en logging |

---

## 3. Stapsgewijze setup

### 3.1. Voorbereiding

1. Maak een **GitHub-repository** met alle TeamReel-code (frontend + backend).
2. Zorg dat `requirements.txt` (Python) en `package.json` (Next.js) aanwezig zijn.
3. Voeg een `.env`-bestand toe (nooit committen) met:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `SECRET_KEY`
   - `DEBUG=False`

> **Tip:** gebruik een `.env.example` bestand om veilige structuur te delen met toekomstige teamleden.

---

### 3.2. Koppeling met Railway

1. Maak een account aan op [https://railway.app](https://railway.app).
2. Klik **“New Project → Deploy from GitHub Repo”**.
3. Selecteer je TeamReel-repository.
4. Railway detecteert automatisch je stack (Python + Node).
5. Voeg in de Railway dashboardomgeving de benodigde **Environment Variables** toe (`DATABASE_URL`, `SECRET_KEY`, etc.).
6. Railway maakt automatisch een database aan en koppelt die aan Django.

> **Kernboodschap:** *Deployment in minuten, zonder handmatige installaties.*

---

### 3.3. Continuous Integration (CI) via GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ "main" ]

jobs:
  build-test-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: 3.11

      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          npm install --prefix frontend

      - name: Run tests
        run: |
          python backend/manage.py test
          npm test --prefix frontend

      - name: Deploy to Railway
        uses: railwayapp/railway-deploy@v1
        with:
          railwayToken: ${{ secrets.RAILWAY_TOKEN }}
```

> **Uitleg:**
> - Iedere push naar `main` triggert automatische tests en build.
> - Alleen bij succes wordt de nieuwe versie live gezet.

---

### 3.4. Post-deployment controles

| Check | Tool | Doel |
|--------|------|------|
| **Serverstatus** | Railway Logs | Controle op foutmeldingen of crash. |
| **Databaseconnectie** | Railway Dashboard | Controleren of tabellen en migraties werken. |
| **API-test** | Postman / cURL | Check `/api/v1/health/` of `/api/v1/clubs/`. |
| **UI-test** | Browser | Frontend laadt correct, assets renderen. |

> **Kernboodschap:** *Elke release moet getest én gevalideerd zijn.*

---

## 4. Beveiliging

| Onderdeel | Maatregel |
|------------|------------|
| **Environment Variables** | Nooit committen — beheer via Railway dashboard. |
| **SSL-certificaat** | Automatisch geregeld via Railway (HTTPS). |
| **API Keys** | Bewaren in GitHub Secrets of Railway Env. |
| **Backups** | Databasebackups wekelijks automatisch uitvoeren. |
| **Monitoring** | Fouten loggen via Sentry, prestatie via Grafana. |

> **Kernboodschap:** *Beveiliging is standaard, niet optioneel.*

---

## 5. Rollback-procedure
Als een release mislukt:

1. Open Railway → klik op **“Deployments”**.
2. Selecteer de vorige succesvolle versie.
3. Klik **“Redeploy”**.
4. Controleer opnieuw de API-health (`/api/v1/health/`).

> **Kernboodschap:** *Herstel moet sneller zijn dan de fout.*

---

## 6. Documentatie-update
Bij elke geslaagde deployment:

| Actie | Locatie |
|--------|----------|
| **Versienummer verhogen** | `CHANGELOG.md` |
| **Status noteren** | `progress_log.md` |
| **Evaluatie (optioneel)** | `evaluation_report.md` |

> **Kernboodschap:** *Documenteer wat je doet — elke stap bouwt vertrouwen.*

---

## 7. Samenvatting
Deployment van TeamReel is ontworpen als een gestroomlijnd, betrouwbaar proces.
Met één push naar GitHub wordt automatisch getest, gebouwd en gedeployed.
De combinatie van **GitHub Actions + Railway** biedt snelheid, eenvoud en schaalbaarheid zonder complex beheer.

> **Kernboodschap:** *Eén klik, één standaard, altijd gecontroleerd.*
