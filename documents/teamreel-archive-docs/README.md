<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [⚽ TeamReel – AI voor sportcommunicatie](#-teamreel--ai-voor-sportcommunicatie)
  - [🎯 Missie](#-missie)
  - [👥 Doelgroep](#-doelgroep)
  - [🧩 Belangrijkste functies](#-belangrijkste-functies)
  - [⚙️ Technische basis](#-technische-basis)
  - [📚 Documentatie](#-documentatie)
  - [🛠️ Ontwikkeling](#-ontwikkeling)
    - [Lokale setup (conceptueel)](#lokale-setup-conceptueel)
  - [🚀 Deployment](#-deployment)
  - [🧭 Toekomstige richting](#-toekomstige-richting)
  - [🧠 Auteur](#-auteur)
  - [⚖️ Licentie](#-licentie)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# ⚽ TeamReel – AI voor sportcommunicatie

> **Van vrijwilligers naar verhalenmakers.**
> TeamReel helpt sportclubs om automatisch professionele video’s, visuals en content te maken —
> in hun eigen stijl, met één druk op de knop.

---

## 🎯 Missie
TeamReel maakt sportcommunicatie slim, eenvoudig en leuk.
Met behulp van AI kunnen vrijwilligers binnen clubs in minuten content genereren
die normaal uren kost om te maken.
Zo wordt elke club een mediaclub — zonder extra werk.

> **Kernboodschap:** *AI als assistent, niet als vervanger.*

---

## 👥 Doelgroep
TeamReel richt zich in eerste instantie op:
- **Vrijwilligers en communicatiespecialisten** binnen amateurclubs
- **Trainers en teambeheerders** die snel updates willen delen
- **Clubbesturen en bonden** die consistent willen communiceren

Toekomstige uitbreiding naar andere sporten (hockey, volleybal, handbal, basketbal) is voorzien.

---

## 🧩 Belangrijkste functies

| Module | Functie |
|---------|----------|
| **AI Studio** | Automatische video- en beeldgeneratie op basis van wedstrijddata |
| **Dashboard** | Overzicht van teams, wedstrijden en AI-content |
| **Teambeheer** | Invoer van teams, spelers en sponsors |
| **Contentbibliotheek** | Doorzoekbare opslag van alle visuals en video’s |
| **Creditsysteem** | Beheert gebruik en AI-verbruikstransparantie |
| **Rapportage** | Inzicht in contentprestaties per club |

> **Kernboodschap:** *Eenvoudig voor vrijwilligers, krachtig voor clubs.*

---

## ⚙️ Technische basis

| Onderdeel | Technologie |
|------------|--------------|
| **Frontend** | Next.js (React + Tailwind CSS) |
| **Backend** | Django REST Framework |
| **Database** | PostgreSQL |
| **AI-engine** | LangGraph + OpenAI API |
| **CI/CD** | GitHub Actions |
| **Hosting** | Railway.app |
| **Monitoring** | Grafana + Sentry |

> **Kernboodschap:** *Moderne tools, eenvoudige structuur.*

---

## 📚 Documentatie

De volledige documentatie bevindt zich in de map [`/docs/`](./docs/).
Deze is verdeeld in vier hoofdsecties:

| Map | Onderwerp |
|------|-------------|
| [`0_business`](./docs/0_business/) | Strategie & Positionering |
| [`1_product`](./docs/1_product/) | Ontwerp, Techniek & Productie |
| [`2_brand`](./docs/2_brand/) | Merk, Identiteit & Vormgeving |
| [`3_operations`](./docs/3_operations/) | Kwaliteit, Beheer & Uitvoering |

Voor een overzicht van alle bestanden, zie:
👉 [`/docs/index.md`](./docs/index.md)

> **Kernboodschap:** *Alles wat TeamReel is — van visie tot uitvoering — staat vastgelegd.*

---

## 🛠️ Ontwikkeling

### Lokale setup (conceptueel)
```bash
# Backend starten
cd backend
pip install -r requirements.txt
python manage.py runserver

# Frontend starten
cd frontend
npm install
npm run dev
```

> **Tip:** gebruik `.env.example` om je lokale omgeving veilig te configureren.

---

## 🚀 Deployment

Deployment verloopt via **GitHub Actions** en **Railway.app**.
Elke push naar de `main`-branch triggert automatisch:
1. Tests
2. Build
3. Deploy

Volledige handleiding: [deployment_guide.md](./docs/3_operations/deployment_guide.md)

---

## 🧭 Toekomstige richting

| Fase | Focus |
|------|--------|
| **2025 – MVP** | Eerste versie, testclubs en feedback verzamelen |
| **2026 – Multisport** | Nieuwe sporten en UX-verbetering |
| **2027 – Internationalisatie** | Meertaligheid en schaalvergroting |
| **2028 – Automatisering** | Nieuwe modules en community features |

> **Kernboodschap:** *Kleine stappen, grote groei.*

---

## 🧠 Auteur

**Brian Stokvis**
Productontwikkelaar
📍 Zwolle, Nederland
🌐 [teamreel.app](https://teamreel.app) *(placeholder)*

> **“Sportieve energie met digitale helderheid.”*

---

## ⚖️ Licentie
Copyright © 2025 Brian Stokvis
Alle rechten voorbehouden.
Gebruik of reproductie van deze documentatie of code is alleen toegestaan met schriftelijke toestemming.

> **Kernboodschap:** *Open in kennis, zorgvuldig in eigendom.*
