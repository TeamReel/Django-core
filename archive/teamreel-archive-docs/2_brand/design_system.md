# 🧱 Design System – TeamReel

> **Van merk naar interface – één stijl, vele toepassingen.**

---

## 1. Doel van dit document
Het *Design System* vertaalt de visuele identiteit van TeamReel naar herbruikbare UI-componenten.
Het zorgt ervoor dat elke knop, kaart of melding er hetzelfde uitziet en hetzelfde aanvoelt — ongeacht wie hem bouwt of waar hij wordt gebruikt.

> **Kernboodschap:** *Consistentie versnelt creatie en versterkt herkenning.*

---

## 2. Principes

| Principe | Betekenis | Toepassing |
|-----------|------------|-------------|
| **Eenvoud** | Minder visuele ruis, meer focus op inhoud. | Schone layouts, veel witruimte. |
| **Herkenbaarheid** | Zelfde kleuren, vormen en hiërarchie. | Hergebruik tokens uit de *Style Foundation*. |
| **Toegankelijkheid** | Duidelijke contrasten, leesbare tekst. | Altijd minimaal AA-contrastniveau. |
| **Flexibiliteit** | Componenten werken op mobiel, tablet, desktop. | Responsieve bouw met Tailwind of CSS-grid. |

> **Kernboodschap:** *Het systeem is er niet om te beperken, maar om te versnellen.*

---

## 3. Componentcategorieën

| Categorie | Beschrijving | Voorbeeldcomponenten |
|------------|---------------|------------------------|
| **Navigatie** | Elementen waarmee de gebruiker door de app beweegt. | Navbar, zijmenu, breadcrumb, tabbar. |
| **Actie** | Elementen waarmee de gebruiker een handeling uitvoert. | Knoppen, toggles, formulieren. |
| **Informatie** | Onderdelen die gegevens tonen. | Cards, tabellen, badges. |
| **Feedback** | Componenten die status of resultaten tonen. | Alerts, modals, toasts, loading states. |
| **Interactief media** | Dynamische contentweergave. | Video-player, gallery, preview-component. |

> **Kernboodschap:** *Een goede interface voelt vertrouwd — omdat alles klopt.*

---

## 4. Kerncomponenten

### 4.1 Knoppen (Buttons)
Knoppen vormen de primaire interactie in TeamReel.

| Variant | Beschrijving | Stijlregels |
|----------|---------------|-------------|
| **Primary Button** | Voor hoofdacties (opslaan, starten, verzenden). | Achtergrond `#007BFF`, tekst `#FFFFFF`, radius 8px. |
| **Secondary Button** | Voor ondersteunende acties. | Border `#007BFF`, tekst `#007BFF`, transparante achtergrond. |
| **Danger Button** | Voor destructieve acties (verwijderen, resetten). | Achtergrond `#DC3545`, tekst `#FFFFFF`. |

> **Toon:** kort, actief, positief (bijv. “Start generatie”, “Opslaan”, “Bekijk”).

---

### 4.2 Cards
Cards groeperen content en zorgen voor overzicht.

| Element | Richtlijn |
|----------|------------|
| Achtergrond | `#FFFFFF` met zachte schaduw (`rgba(0,0,0,0.05)`). |
| Hoekradius | 16px (groot voor toegankelijke uitstraling). |
| Afstand binnenin | Padding 16–24px. |
| Schaduwen | Alleen in hoverstates of voor nadruk. |

> **Gebruik:** spelers, teams, contentvoorbeelden, rapportages.

---

### 4.3 Formulieren
Formulieren zijn eenvoudig, duidelijk en mobielvriendelijk.

| Element | Richtlijn |
|----------|------------|
| Labels | Altijd zichtbaar boven input. |
| Foutmeldingen | Rood, compact en concreet (“Naam is verplicht”). |
| Focusstate | Blauwe rand (`#007BFF`) met lichte gloed. |
| Knoppen | Altijd onder het formulier, rechts uitgelijnd. |

> **Kernboodschap:** *Formulieren moeten aanvoelen als gesprek, niet als drempel.*

---

### 4.4 Feedbackcomponenten
Deze tonen status, bevestiging of fouten.

| Type | Voorbeeld | Stijl |
|-------|------------|--------|
| **Success Alert** | “Je video is succesvol gegenereerd!” | Groen `#28A745`, lichte achtergrond `#E6F4EA`. |
| **Error Alert** | “Er ging iets mis, probeer opnieuw.” | Rood `#DC3545`, achtergrond `#FDECEA`. |
| **Info Alert** | “AI-output wordt verwerkt…” | Blauw `#007BFF`, achtergrond `#E8F0FE`. |

> **Kernboodschap:** *Feedback geeft vertrouwen — zelfs als iets misgaat.*

---

### 4.5 Interactieve componenten
| Component | Functie | Opmerkingen |
|------------|----------|-------------|
| **Video Preview Player** | Laat AI-generated video’s zien in de AI Studio. | Simpele play-knop, overlay met logo. |
| **Gallery Grid** | Toont visuele content in een raster. | 3–4 kolommen op desktop, 1–2 op mobiel. |
| **Modal / Overlay** | Voor bevestigingen of previews. | Transparante donkere achtergrond (`rgba(0,0,0,0.5)`). |

> **Kernboodschap:** *De gebruiker blijft altijd in controle.*

---

## 5. Stijl- en interactieregels

| Aspect | Richtlijn |
|---------|------------|
| **Kleurgebruik** | Gebruik primair blauw (`#007BFF`) als leidraad voor acties. |
| **Hoverstates** | Altijd subtiel lichter of donkerder, niet schreeuwerig. |
| **Animaties** | Max. 200–300ms, lineair of ease-in-out. |
| **Toetsenbordnavigatie** | Alle componenten zijn toegankelijk via tab. |
| **Responsiviteit** | Componenten schalen vloeiend mee zonder breuken. |

> **Kernboodschap:** *Snel, soepel, sportief.*

---

## 6. Implementatie & tools

| Tool | Functie | Opmerking |
|-------|----------|------------|
| **Tailwind CSS** | CSS-utility framework | Ideaal voor snelle, consistente layout. |
| **React (Next.js)** | Componentgebaseerde UI | Herbruikbare bouwblokken voor AI Studio en Dashboard. |
| **Figma / Tokens Studio** | Ontwerp- en tokensbeheer | Synchronisatie tussen design en code. |
| **Lucide Icons** | Open-source iconenset | Sportieve, ronde stijl past bij TeamReel. |

> **Kernboodschap:** *Design en code spreken dezelfde taal.*

---

## 7. Samenvatting
Het Design System van TeamReel brengt vorm en functie samen in één taal.
Door herbruikbare componenten, consistente kleuren en duidelijke richtlijnen ontstaat een gebruikservaring die sportief, professioneel en herkenbaar is — op elk scherm, in elke context.

> **Kernboodschap:** *TeamReel voelt altijd als TeamReel — omdat alles klopt.*
