# H2 — Assets tab (hergebruik ClubAssetsSection)

| | |
|---|---|
| Status | TODO |
| Effort | ~2 uur |
| Blokkeerd door | H0, F24 H3 (ClubAssetsSection moet gebouwd zijn) |

## Doel

De Assets tab van de Club Hub toont en beheert alle club-level BrandAssets. Het hergebruikt de `ClubAssetsSection` component die in F24 H3 is gebouwd — **zonder wijzigingen aan dat component**.

Tegelijkertijd: na F25 H2 is de `ClubAssetsSection` op de **Team Hub Assets tab overbodig** geworden als bewerkbare sectie. Die wordt teruggebracht naar een read-only preview die linkt naar de Club Hub.

## Principes

- **`ClubAssetsSection` wordt op één plek bewerkt**: de Club Hub Assets tab
- **Team Hub Assets tab**: toont club assets als read-only samenvatting + "Beheer via Club Hub →" link
- Geen kopie of aangepaste versie van `ClubAssetsSection` — zelfde component, zelfde props

## Taken

### 1. Club Hub Assets tab

Sub-component: `demo/src/pages/identity/ClubAssetsTab.tsx` (< 100 regels — wraps bestaand component)

```tsx
// ClubAssetsTab.tsx — simpele wrapper
import { ClubAssetsSection } from '@/components/AssetsTab/ClubAssetsSection';

export function ClubAssetsTab({ clubProject }: { clubProject: Project }) {
  return (
    <div className={styles.assetsTab}>
      <ClubAssetsSection
        clubProject={clubProject}
        isEditable={true}   // altijd bewerkbaar op Club Hub (RBAC zit in component)
      />
    </div>
  );
}
```

- [ ] `ClubAssetsSection` geeft een `isEditable` prop door (of leest RBAC intern)
- [ ] Geen extra logica nodig — alle upload, preview, inheritance-badges zitten al in het component
- [ ] Sectie headers, tokens, loading states: al geïmplementeerd in F24 H3

### 2. Team Hub Assets tab updaten (F24 codefixup)

In de Team Hub (`MyTeamHubPage.tsx` → `AssetsTabContent.tsx`) de `ClubAssetsSection` aanpassen:
- [ ] `isEditable={false}` doorgeven (read-only modus)
- [ ] Voeg link toe onderaan de club sectie: "Beheer club assets via Club Hub →" (`routes.clubHubWithTab(orgSlug, clubSlug, 'assets')`)
- [ ] Club admin op de Team Hub ziet de link staan maar kan niet uploaden via de team hub

> **Let op**: dit is een kleine wijziging aan F24-code. Coördineer zodat beide fases niet tegelijk aan hetzelfde bestand werken.

### 3. Verificatie dat `ClubAssetsSection` herbruikbaar is

Check dat de component die in F24 H3 is gebouwd de volgende props accepteert:
```ts
interface ClubAssetsSectionProps {
  clubProject: Project;
  isEditable?: boolean;  // default true
}
```
Als de prop er niet is: voeg toe tijdens F25 H2 (minimale wijziging).

## Verificatie

- [ ] Club Hub Assets tab: alle club assets zichtbaar (logo, sponsor, kits, locatie)
- [ ] Club admin: upload knoppen actief, in-place opslaan werkt
- [ ] Team Hub Assets tab: club sectie toont assets read-only
- [ ] Team Hub: link "Beheer via Club Hub →" zichtbaar en functioneel
- [ ] `ClubAssetsSection` component niet gedupliceerd (zelfde bronbestand)
- [ ] `npx tsc --noEmit` clean
