# H4 — MemberDetailPanel Role Tabs

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~4 uur |
| Laag | Frontend |
| Afhankelijkheid | H3 |

## Doel

MemberDetailPanel uitbreiden met een roltabbladen/selector zodat assets per rol bekeken en beheerd worden.

## Implementatie

### 1. Role selector in MemberDetailPanel

**Bestand**: `demo/src/pages/periods/MemberDetailPanel.tsx`

- Bovenaan panel: horizontale role pills (vergelijkbaar met H13 roleBadges)
- Toont alle rollen van het lid (uit `functional_roles`)
- Default: primaire rol geselecteerd
- Switch van rol → toont assets voor die rol

### 2. MemberAssetsTab per rol

**Bestand**: `demo/src/pages/periods/MemberAssetsTab.tsx`

- Ontvangt `selectedRole` prop
- Leest assets via `getAssetsForRole(metadata, selectedRole)` (H0/H3)
- Per-kit cards tonen alleen relevante kits:
  - **keeper**: keeper kit alleen
  - **player**: home, away, third
  - **coach/staf**: geen kit-specifieke assets, alleen closeup/intro

### 3. Upload/generate context

- Upload button stuurt `role` mee naar API
- AI generate button stuurt `role` context mee
- Nieuwe asset verschijnt direct onder correcte rol-tab

### 4. Empty state per rol

- Rol zonder assets: "Nog geen assets voor [rol]. Upload of genereer hier."
- Actie-buttons prominent (camera icon, AI icon)

### CSS

- `.roleSelector` — horizontal pill bar boven assets
- `.roleTab` — pill (re-use `.roleBadge` styling)
- `.roleTab[data-active]` — primaire kleur
- Touch target ≥ 44×44px
- Mobile: horizontal scrollable bij veel rollen

## Acceptatiecriteria

- [ ] Role pills tonen alle rollen van lid
- [ ] Switch rol → assets updaten
- [ ] Per-kit cards correct per roltype
- [ ] Upload/generate stuurt role mee
- [ ] Empty state per rol
- [ ] Responsive op mobile
- [ ] Keyboard navigeerbaar (arrow keys)
