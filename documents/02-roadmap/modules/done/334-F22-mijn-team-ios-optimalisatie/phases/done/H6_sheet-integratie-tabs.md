# H6 — Sheet-integratie: alle tabs gebruiken sheets i.p.v. navigatie

> **Effort:** ~2 uur | **Impact:** Alle taps blijven op de hub — volledige iOS-consistentie

## Doel

De sheets uit H4 en H5 integreren in alle hub-tabs. Geen enkele tap navigeert meer weg van de hub (tenzij de user expliciet "Ga naar..." kiest in de sheet).

## Wijzigingen per bestand

### 1. `MyTeamHubPage.tsx` — state + sheet rendering

```tsx
// Nieuwe state
const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);

// Sheets renderen (onder tab content, lazy loaded)
<MatchSummarySheet
  match={selectedMatch}
  isOpen={!!selectedMatch}
  onClose={() => setSelectedMatch(null)}
  matchDisplayTitle={d.matchDisplayTitle}
  matchDetailPath={selectedMatch ? getMatchPath(selectedMatch, ...) : ''}
  isAdmin={isAdmin}
/>
<MemberSummarySheet
  member={selectedMember}
  isOpen={!!selectedMember}
  onClose={() => setSelectedMember(null)}
  memberDetailPath={selectedMember ? d.memberDetailHref(String(selectedMember.id)) : ''}
  isAdmin={isAdmin}
  onPrev={...}    // vorige lid in members array
  onNext={...}    // volgende lid
  hasPrev={...}
  hasNext={...}
/>
```

### 2. `HubWedstrijdenTab.tsx` — match tap → sheet

**Was:**
```tsx
const goToMatch = (m: MatchRecord) => {
  const path = getMatchPath(m, isTeamRoute, seasonsBasePath, seasonPathKey);
  navigate(path);
};
```

**Wordt:**
```tsx
// Nieuwe prop
onMatchTap: (m: MatchRecord) => void;

// In Row:
onTap={() => onMatchTap(m)}
```

De `navigate` call verhuist naar de sheet "Ga naar wedstrijd" knop.

### 3. `HubSelectieTab.tsx` — member tap → sheet

**Was:**
```tsx
onTap={() => navigate(memberDetailHref(mid))}
```

**Wordt:**
```tsx
// Nieuwe prop
onMemberTap: (m: SquadMember) => void;

// In Row:
onTap={() => onMemberTap(m)}
```

### 4. `HubMediaTab.tsx` — member tap → sheet

**Was:**
```tsx
onClick={() => navigate(memberDetailHref(mid))}
```

**Wordt:**
```tsx
// Nieuwe prop
onMemberTap: (m: SquadMember) => void;

// In row/cell:
onClick={() => onMemberTap(member)}
```

### 5. Overview "Bekijk wedstrijd" — sheet i.p.v. navigate

**Was:**
```tsx
onClick={() => navigate(nextMatchUrl)}
```

**Wordt:**
```tsx
onClick={() => setSelectedMatch(nextMatch)}
```

## Callback flow

```
Tab component
  → onMatchTap(match) / onMemberTap(member)
    → MyTeamHubPage: setSelectedMatch/setSelectedMember
      → Sheet opent
        → User kiest "Ga naar [detail]"
          → navigate() + onClose()
```

## Tab-switch sluit open sheet

Wanneer een sheet open is en de gebruiker op een andere tab tikt:
1. Open sheet sluit **direct** (geen animatie, instant close)
2. Tab-content wisselt normaal
3. Voorkomt visuele verwarring (sheet van ene tab open terwijl andere tab actief)

```tsx
// In MyTeamHubPage, bij tab wisseling:
useEffect(() => {
  setSelectedMatch(null);
  setSelectedMember(null);
}, [activeTab]);
```

Consistent met bestaand gedrag: Homepage MatchSheetFlow sluit ook bij navigatie-events.

## Edge cases

- **Double-tap debounce**: Twee snelle taps op dezelfde row opent sheet maar eenmaal. `setSelectedMatch` is al idempotent (zelfde match → geen re-render).
- **"Bekijk profiel" → MemberDetailPanel**: Sheet sluit, MemberDetailPanel opent. Twee modals mogen niet tegelijk open zijn — sheet `onClose` callback moet eerst completen voordat panel opent (via `setTimeout(0)` of `requestAnimationFrame`).
- **Sheet open + browser resize**: NavigationSheet handelt dit al (CSS media query wisselt slide-up ↔ side-panel).

## Checklist

- [x] State toevoegen aan `MyTeamHubPage`: `selectedMatch`, `selectedMember`
- [x] `MatchSummarySheet` renderen in MyTeamHubPage
- [x] `MemberSummarySheet` renderen in MyTeamHubPage met < > navigatie
- [x] `HubWedstrijdenTab`: nieuwe `onMatchTap` prop, `navigate()` fallback behouden
- [x] `HubSelectieTab`: nieuwe `onMemberTap` prop, `navigate()` fallback behouden
- [x] `HubMediaTab`: nieuwe `onMemberTap` prop, `navigate()` fallback behouden
- [x] Overview "Bekijk wedstrijd": `setSelectedMatch(nextMatch)` i.p.v. navigate
- [x] Tab-switch sluit open sheet (`useEffect` op `activeTab`)
- [x] `nextMatchUrl` dead code verwijderd
- [x] TypeScript strict, geen `any`
- [ ] Verifieer: geen enkele tap navigeert nog weg (behalve via sheet-knop)
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
- [ ] Bestaande tests updaten voor nieuwe props
