# 📊 Notion Weergaven & Dashboards

## 🔹 1. Weergaven per Database

### 🧩 Fases
**Doel:** strategisch overzicht op voortgang en planning.
**Aanbevolen weergaven:**
1. **Tijdlijnweergave – “Project Roadmap”**
   - Groepering: Fase Naam
   - As: Periode
   - Toon: Status, Gemiddelde Voortgang (%)
2. **Tabel – “Strategisch overzicht”**
   - Kolommen: Fase Naam, Beschrijving, Periode, Totale Tijd (uren), Gemiddelde Voortgang (%), Status
   - Sorteren op: Startdatum
3. **Voortgangsbalk – “Voortgang per Fase”**
   - Groepering: Status
   - Weergave: voortgangsbalk (%)
4. **Samenvatting – “Dashboardkaart”**
   - Gebruik als linked database in je hoofd-dashboard (alleen Fase Naam + voortgang).

---

### ⚙️ Blokken
**Doel:** tactisch overzicht van deliverables en dependencies.
**Aanbevolen weergaven:**
1. **Tabel – “Alle Blokken”**
   - Kolommen: Blok Naam, Fase, Doel / Deliverable, Type / Scope, Gemiddelde Voortgang (%), Status
   - Filter: Status ≠ Gereed
2. **Board – “Blokken per Status”**
   - Groepering: Status
   - Kaart: Blok Naam + Gemiddelde Voortgang (%)
3. **Board – “Blokken per Fase”**
   - Groepering: Fase
   - Gebruik voor overzicht van voortgang per onderdeel.
4. **Tijdlijn – “Planning Blokken”**
   - As: Periode (geërfd via Fase of via modules).
   - Voor planningsoverzicht op middellange termijn.

---

### 🔧 Modules
**Doel:** operationele sturing en werkplanning.
**Aanbevolen weergaven:**
1. **Tabel – “Takenoverzicht”**
   - Kolommen: Module Naam, Blok, Categorie, Status, Prioriteit, GPT, Tools / Systemen, Tijd (uren), Planning (week)
   - Sorteren: eerst op Prioriteit, dan op Status.
2. **Board – “Kanban per Status”**
   - Groepering: Status (Niet gestart / In uitvoering / Gereed).
   - Kaart: Module Naam + GPT + voortgangspercentage.
3. **Tabel – “Werk per GPT”**
   - Groepering: GPT
   - Ideaal voor overzicht van wie of wat verantwoordelijk is per type werk.
4. **Tijdlijn – “Moduleplanning”**
   - As: Planning (week)
   - Gebruik als week- of sprintplanning.
5. **Filter – “Actieve Modules”**
   - Filter: Status = In uitvoering
   - Snelle weergave voor huidige focus.

---

## 🔹 2. Hoofdstructuur van Pagina’s

### 🏠 **Dashboard**
Centrale hub met:
- Huidige Fase + voortgangsbalk
- Openstaande modules (Status = In uitvoering)
- Samenvatting van totale voortgang per fase
- Knoppen/links naar *Roadmap & Fases*, *Projecten en Modules*, *Metrics & Feedback*

> *Tip:* gebruik widgets of Notion’s progressbar (formules) voor visuele voortgang.

---

### 🗺️ **Roadmap & Fases**
Tijdlijn van alle Fases met subtaken en milestones:
- Linked database van *Fases* met “Project Roadmap”-view
- Gekoppelde *Blokken*-weergave eronder met voortgang per Fase
- Ruimte voor notities over planningswijzigingen of afhankelijkheden

---

### ⚙️ **Projecten en Modules**
Operationeel overzicht:
- Board-view van *Modules per Status*
- Filter voor actieve sprints of blokken
- Automatische voortgangsstatistiek per GPT-assistent

---

### 📘 **Documentatie**
Koppelt inhoud aan structuur:
- Links naar *Businessplan*, *Functioneel ontwerp*, *Technisch ontwerp*
- Subpagina’s: API’s, Datamodel, Ontwerpbeslissingen
- Gebruik synchrone blokken of ingebedde bestanden voor versiebeheer

---

### 🎨 **Brand & Communicatie**
Focus op merkconsistentie:
- Merkstijl en tone-of-voice richtlijnen
- Templates voor communicatie en visuals
- Notion-gallery met brandingvoorbeelden of contentideeën
- Koppeling met *Modules* van type “Communicatie” of “Design”

---

### 📈 **Metrics & Feedback**
Evaluatie en verbetering:
- Samenvattende tabel met meetwaarden (uren, voortgang, aantal afgeronde modules)
- Feedbacklog (bijv. inzichten, retrospectieve notities)
- Grafieken (via Notion-databases of gekoppelde tools zoals Google Sheets)
- KPI’s per fase of GPT-assistent

---

## 🔹 3. Richtlijnen
- Houd weergaven per pagina licht en gefocust (max. 2–3 linked databases per view).
- Gebruik *Board* voor visueel overzicht, *Tabel* voor detail, *Tijdlijn* voor planning.
- Bouw dashboards modulair, zodat ze voor elk nieuw project eenvoudig te kopiëren zijn.

---

## Kernfunctie
Deze weergaven en pagina’s vormen de **visuele laag van het Project Architect-systeem**.
Ze geven in één oogopslag inzicht in voortgang, planning, deliverables en gebruikte GPT’s — zonder ruis of dubbele invoer.
