# ⚙️ Notion Setupgids – Project Architect Systeem

Deze gids helpt je het complete Project Architect-systeem op te zetten in Notion, inclusief databases, relaties, formules, views en dashboards.

---

## 🧱 1. Basisstructuur aanmaken

### 1.1 Maak drie databases:
1. **Fases**
2. **Blokken**
3. **Modules**

Gebruik bij voorkeur inline-databases op een hoofdpagina “📁 Project Architect” of als full-page databases in een aparte werkruimte per project.

---

## 🧩 2. Tabellen configureren

### 2.1 **Modules**
*(Begin met Modules; andere tabellen rollen hun data hieruit op.)*

| Kolom              | Type              | Instellingen                                                                        |
| ------------------ | ----------------- | ----------------------------------------------------------------------------------- |
| Module Naam        | Titel             | -                                                                                   |
| Blok (relatie)     | Relatie → Blokken | Meerdere modules per blok toestaan                                                  |
| Categorie          | Select            | Feature / Analyse / Documentatie / Test / Overig                                    |
| Doel / Deliverable | Tekst             | Korte beschrijving                                                                  |
| Prioriteit         | Select            | Hoog / Middel / Laag                                                                |
| Status             | Select            | Niet gestart / In uitvoering / Gereed                                               |
| Voortgang (%)      | Formule           | `if(prop("Status") == "Gereed", 100, if(prop("Status") == "In uitvoering", 50, 0))` |
| Tijd (uren)        | Getal             | -                                                                                   |
| Planning (week)    | Tekst of Datum    | Weeknummer of periode                                                               |
| Tools / Systemen   | Multi-select      | (bijv. Python, Figma, Power BI, Django)                                             |
| GPT                | Select            | (bijv. Design GPT, Dev GPT, Data GPT)                                               |
| Opmerkingen        | Tekst             | Optioneel voor context                                                              |

---

### 2.2 **Blokken**
| Kolom                    | Type              | Instellingen                                                                                                                  |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Blok Naam                | Titel             | -                                                                                                                             |
| Fase (relatie)           | Relatie → Fases   | Meerdere blokken per fase                                                                                                     |
| Doel / Deliverable       | Tekst             | Beschrijving van het resultaat                                                                                                |
| Type / Scope             | Select            | Design / Data / Development / Communicatie                                                                                    |
| Modules (relatie)        | Relatie → Modules | Gekoppeld via Blok                                                                                                            |
| Aantal Modules           | Roll-up           | `count(prop("Modules"))`                                                                                                      |
| Totale Tijd (uren)       | Roll-up           | `sum(prop("Modules").Tijd (uren))`                                                                                            |
| Gemiddelde Voortgang (%) | Roll-up           | `average(prop("Modules").Voortgang (%))`                                                                                      |
| Status                   | Formule           | `if(prop("Gemiddelde Voortgang (%)") == 100, "Afgerond", if(prop("Gemiddelde Voortgang (%)") > 0, "Actief", "Niet gestart"))` |
| Opmerkingen              | Tekst             | -                                                                                                                             |

---

### 2.3 **Fases**
| Kolom                    | Type              | Instellingen                                                                                                                  |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Fase Naam                | Titel             | -                                                                                                                             |
| Beschrijving             | Tekst             | Korte toelichting                                                                                                             |
| Periode                  | Datum             | Start–einddatum                                                                                                               |
| Blokken (relatie)        | Relatie → Blokken | Meerdere per fase                                                                                                             |
| Aantal Blokken           | Roll-up           | `count(prop("Blokken"))`                                                                                                      |
| Aantal Modules           | Roll-up           | `count(prop("Blokken").Modules)`                                                                                              |
| Totale Tijd (uren)       | Roll-up           | `sum(prop("Blokken").Totale Tijd (uren))`                                                                                     |
| Gemiddelde Voortgang (%) | Roll-up           | `average(prop("Blokken").Gemiddelde Voortgang (%))`                                                                           |
| Status                   | Formule           | `if(prop("Gemiddelde Voortgang (%)") == 100, "Afgerond", if(prop("Gemiddelde Voortgang (%)") > 0, "Actief", "Niet gestart"))` |

---

## 🗂️ 3. Views configureren

### Fases
- **Tijdlijn – “Project Roadmap”** (op basis van Periode)
- **Tabel – “Strategisch overzicht”** (Voortgang + Status zichtbaar)

### Blokken
- **Board – “Blokken per Fase”**
- **Tabel – “Alle Blokken”** (filter op Status ≠ Gereed)

### Modules
- **Board – “Kanban per Status”**
- **Tabel – “Takenoverzicht”** (sorteren op Prioriteit)
- **Tijdlijn – “Moduleplanning”** (via Planning-week)
- **Tabel – “Werk per GPT”** (groeperen op GPT)

---

## 🧭 4. Dashboardstructuur

Maak een hoofdpagina **📊 Project Dashboard** met de volgende *linked databases*:

### Sectie 1 – Voortgangsoverzicht
- Linked view van *Fases (Strategisch overzicht)*
- Voortgangsbalk per fase met gemiddelde (%)

### Sectie 2 – Actieve Blokken & Modules
- Linked view van *Blokken (Status = Actief)*
- Linked view van *Modules (Status = In uitvoering)*
- Samenvatting van totale uren en voortgang (formule of roll-up)

### Sectie 3 – Metrics & Feedback
- Nieuwe database “Metrics & Feedback” met velden:
  - KPI / Metric
  - Huidige waarde
  - Doelwaarde
  - Opmerkingen / inzichten
- Grafiek of tabel gekoppeld aan *Fases* of *Modules*

---

## 🗺️ 5. Extra Pagina’s

| Pagina                   | Inhoud                                                   |
| ------------------------ | -------------------------------------------------------- |
| **Roadmap & Fases**      | Tijdlijn van alle fases, gekoppelde blokken eronder      |
| **Projecten en Modules** | Boardweergave van modules per status of GPT              |
| **Documentatie**         | Links naar Businessplan, Functioneel & Technisch ontwerp |
| **Brand & Communicatie** | Merkstijl, tone-of-voice, sjablonen, visuals             |
| **Metrics & Feedback**   | KPI’s, retrospectives, voortgangsmetingen                |

> 💡 *Gebruik “Linked Databases” en filters om contextspecifieke subsets te tonen.*

---

## 🔁 6. Herbruikbaarheid

1. Zet de hele structuur in één Notion-projectsjabloon.
2. Dupliceer de pagina “📁 Project Architect Template” bij nieuwe projecten.
3. Pas enkel de documentlinks en projectnaam aan.
4. Laat de GPT de structuur analyseren en uitbreiden op basis van de specifieke projectdocumenten.

---

## 🎯 Doel van deze setup
- **Geen dubbele invoer:** voortgang en status rollen automatisch omhoog.
- **Altijd overzicht:** dashboards tonen direct status per fase en GPT.
- **Flexibel en schaalbaar:** geschikt voor elk soloproject of nieuw productidee.
- **Naadloze GPT-integratie:** elke module gekoppeld aan zijn eigen gespecialiseerde GPT.
