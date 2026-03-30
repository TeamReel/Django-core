# Member Asset Save Flow

## Overzicht

Wanneer een AI-gegenereerde afbeelding wordt geaccepteerd via `AssetGenerationModal`, wordt deze opgeslagen in de `metadata.teamreel_assets` van het `ProjectSeasonMembership`-object. Dit document beschrijft de volledige flow, een bekende valkuil (stale closure), en hoe je verkeerd opgeslagen assets kunt repareren.

---

## 1. Data-structuur: `metadata.teamreel_assets`

De assets worden opgeslagen als JSON in het `metadata` veld van `ProjectSeasonMembership`.

```json
{
  "teamreel_assets": {
    "member_in_tenue_home": {
      "storage_path": "some/path/to/image.png",
      "presigned_url": "https://...",
      "asset_type": "member_in_tenue_home",
      "saved_at": "2025-01-01T12:00:00Z"
    },
    "kit_home": { ... },
    "member_closeup_home": { ... }
  }
}
```

**Sleutel**: `asset_type` (bijv. `member_in_tenue_home`, `kit_away`, `member_closeup_home`)
**Root key**: altijd `teamreel_assets` (niet `assets`)

---

## 2. Frontend flow: `onAssetSaved` callback

```
ProjectSeasonMemberDetailPage
  → renders AssetGenerationModal
  → onAssetSaved callback
     → handleMetadataUpdate(newMetadata, targetMembershipId)
        → PATCH /api/projects/memberships/{id}/metadata/
```

De `onAssetSaved` callback wordt aangeroepen vanuit `AssetGenerationModal.handleAccept()`, nadat de variant is geaccepteerd via de backend.

---

## 3. Bekende valkuil: Stale Closure Bug

### Symptoom

Wanneer een gebruiker snel navigeert van lid A → lid B en dan een asset opslaat, werd de asset soms opgeslagen bij **lid A** in plaats van **lid B**.

### Root cause

De `onAssetSaved` callback sloot (via closure) over de **React state** `membership`. Bij een navigatie van lid A → lid B:

1. URL verandert → `membershipId` URL-param is nu lid B
2. `fetch()` start = async → state is nog lid A
3. `onAssetSaved` werd aangeroepen vóórdat de fetch klaar was → `membership.id` was nog lid A

Dit is een klassiek **stale closure** probleem in React.

### Fix (commit `13462443`)

Drie lagen van bescherming in `ProjectSeasonMemberDetailPage.tsx`:

**Laag 1 — Explicit ID parameter**:
```tsx
// handleMetadataUpdate krijgt nu een expliciete targetMembershipId mee
const handleMetadataUpdate = async (
  newMetadata: Record<string, unknown>,
  targetMembershipId?: string,
) => {
  // Prioriteit: passed ID > URL param > state
  const id = targetMembershipId ?? membershipId ?? membership?.id;
  if (!id) return;
  await patchMembershipMetadata(id, newMetadata);
};
```

**Laag 2 — Capture URL param at call time**:
```tsx
// onAssetSaved legt membershipId vast op het moment van aanmaken
const onAssetSaved = async (savedInfo: SavedAssetInfo) => {
  const saveMembershipId = membershipId; // Capture the URL param NOW
  // ...
  await handleMetadataUpdate(newMetadata, saveMembershipId);
};
```

**Laag 3 — Reset state on navigation**:
```tsx
// Membership state wordt gereset wanneer de URL verandert
useEffect(() => {
  setMembership(null);
}, [membershipId]);
```

### Algemene les

> Gebruik nooit React state voor iets dat je in een **async callback** nodig hebt terwijl de gebruiker kan navigeren. Capture de URL-param (of prop) op het moment van aanmaken van de callback, of geef hem expliciet mee als parameter.

---

## 4. Production data reparatie: `repair_member_assets`

Er is een Django management command om verkeerd opgeslagen assets te verplaatsen tussen twee memberships.

### Locatie

```
src/projects/management/commands/repair_member_assets.py
```

### Gebruik

**Stap 1 — Inspecteer een lid (op achternaam)**:
```bash
python manage.py repair_member_assets --inspect Klei
python manage.py repair_member_assets --inspect Oenen
```

Dit print de membership-ID en de huidige `teamreel_assets` van alle leden met die achternaam.

**Stap 2 — Dry-run: bekijk wat er gaat gebeuren**:
```bash
python manage.py repair_member_assets \
  --from-id <UUID-van-verkeerd-lid> \
  --to-id <UUID-van-correct-lid>
```

**Stap 3 — Commit de wijziging**:
```bash
python manage.py repair_member_assets \
  --from-id <UUID-van-verkeerd-lid> \
  --to-id <UUID-van-correct-lid> \
  --commit
```

Het commando:
- Kopieert de gehele `teamreel_assets` block van `--from-id` naar `--to-id`
- Leegt `teamreel_assets` bij `--from-id`
- Toont een samenvatting voor en na

### ⚠️ Railway productie toegang

`railway run python manage.py ...` werkt **niet** voor de productie-database (`postgres.railway.internal` is niet bereikbaar van buiten het Railway-netwerk).

**Gebruik in plaats daarvan** het **Railway web dashboard terminal** (via de Railway website):

```
Railway Dashboard → Backend service → Settings → Open Railway Shell
```

Dan:
```bash
python manage.py repair_member_assets --inspect <ACHTERNAAM>
python manage.py repair_member_assets --from-id <UUID> --to-id <UUID> --commit
```

---

## 5. Verwante bestanden

| Bestand | Rol |
|---|---|
| `demo/src/pages/periods/ProjectSeasonMemberDetailPage.tsx` | Stale closure fix, `handleMetadataUpdate`, `onAssetSaved` |
| `demo/src/components/AssetGenerationModal/AssetGenerationModal.tsx` | Modal + `handleAccept` + `onAssetSaved` callback |
| `demo/src/hooks/useAssetGeneration.ts` | `submit()`, polling, `acceptVariant()` |
| `src/projects/management/commands/repair_member_assets.py` | Management command voor data-reparatie |
| `scripts/repair_member_assets.py` | Django shell helper script (alternatief) |

---

## Gerelateerde docs

- [generative-pipeline.md](generative-pipeline.md) — AI asset generation pipeline
- [branding-tokens.md](branding-tokens.md) — Brand assets gebruikt bij generatie
- [project-hierarchy.md](project-hierarchy.md) — ProjectMembership metadata structuur
