# H6 — Asset Display Fixes (Tenue, Logo, Sponsor)

| | |
|---|---|
| Fase | H6 |
| Status | 📋 TODO |
| Effort | ~4 uur |
| Afhankelijkheid | H5 (done) |

## Wat

Assets worden niet correct getoond in de hub — tenue, sponsor en club logo tonen leeg terwijl ze wél bestaan in de database (bijv. voor ASC Helden 6).

### Problemen

1. **Tenue en sponsor tonen leeg** — Bij klikken op Tenue of Sponsor in Overview toont de `AssetDetailSheet` geen afbeeldingen, ondanks dat deze assets bestaan.
2. **Club logo en club kits tonen leeg** — Dezelfde issue op club-niveau.
3. **Tenue closeup toont profile foto i.p.v. avatar** — Bij member foto in tenue context moet de avatar_url gebruikt worden, niet een eventuele profile_photo.

### Oorzaak (te onderzoeken)

- `useBrandProfile` fetcht assets via `/branding/profiles/?project={id}` met de `clubProjectId` en `teamProjectId`.
- `clubProjectId = isTeamRoute ? club?.id : project?.id` — het `club` object is een `SeasonProject`, maar mogelijk matcht het ID niet met het project waar de brand assets onder hangen.
- `getAsset('logo_upload')` zoekt op `asset_type === 'logo_upload' && is_active` — als de asset_type anders heet in de DB, wordt niets gevonden.
- Mogelijk is er geen BrandProfile aangemaakt voor het club-project, of bevat het `assets` array geen items.

## Technische aanpak

### Debug stappen
1. Console.log in `useBrandProfile` de profile en assets response voor het club- en team-project
2. Check of `club?.id` (vanuit `useSeasonData`) daadwerkelijk het juiste project ID is
3. Vergelijk de `asset_type` in de DB met de keys die `getAsset()` opvraagt
4. Check of `getAssetUrl()` correcte S3 URLs retourneert

### Bestanden
- `demo/src/providers/useSeasonData.ts` — brand asset resolution
- `demo/src/hooks/useBrandProfile.ts` — fetch + getAsset logic
- `demo/src/pages/identity/AssetDetailSheet.tsx` — rendering
- `demo/src/pages/identity/MyTeamHubPage.tsx` — asset status indicators

## Checklist

- [ ] Debug: Log brand profile fetch voor club + team project
- [ ] Fix: `clubProjectId` correct resolven naar het project met de brand assets
- [ ] Fix: Asset type matching (upload/combined/processed keys)
- [ ] Fix: Avatar i.p.v. profile foto in tenue context (member closeup)
- [ ] Verify: Tenue, sponsor, logo, kits tonen correcte afbeeldingen voor ASC Helden 6
- [ ] TypeScript 0 errors, Vite build success
