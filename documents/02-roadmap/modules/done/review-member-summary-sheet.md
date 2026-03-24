# Review Rapport — MemberSummarySheet

| | |
|---|---|
| Datum | 24 maart 2026 |
| Component | `demo/src/pages/identity/MemberSummarySheet.tsx` |
| CSS | `demo/src/pages/identity/MemberSummarySheet.module.css` |
| Commits | `76b1d64a` → `5347119c` → `e23f207f` → `53e382d2` → `5cede59f` → `855098c8` |
| Deploy | `index-nag7piUk.js` (live, geverifieerd via Playwright) |

---

## 1. Samenvatting fixes

| Commit | Fix |
|--------|-----|
| `76b1d64a` | Media alias fallback in `hasAnyVariant()` en `getFirstAssetUrl()` — legacy-kit assets nu zichtbaar |
| `5347119c` | Video thumbnails: kit-vrij variant zoeken + `<video>` element rendering |
| `e23f207f` | Then vs Now fix: `val.processed` fallback verwijderd, media alias voor videos |
| `53e382d2` | S3 bucket policy update + 35 uploads gekopieerd van `uploads/` naar `members/` prefix |
| `5cede59f` | iterVariants flat-structure fallback, upload no-legacy-fallback, fullbody `object-position: top` |
| `855098c8` | Upload row leest nu `user.avatar_url` als primaire bron |

---

## 2. UI Review (Playwright)

### Harold Pierik (lid met alle assets) — ✅ Alles correct

| Asset | Status | Verificatie |
|-------|--------|-------------|
| Avatar | Home-kit closeup foto | ✅ Niet initialen "HP" |
| Upload | **aanwezig** met thumbnail | ✅ Was "ontbreekt", nu opgelost |
| Fullbody in tenue | aanwezig, Thuis = Klaar | ✅ Gezicht zichtbaar (object-position: top) |
| Close-up | aanwezig, home-kit closeup | ✅ Correct, geen legacy fallback |
| Short intro | aanwezig met video thumbnail | ✅ |
| Goal celebration | ontbreekt | ✅ Correct (nog niet gegenereerd) |
| Actiefoto | ontbreekt | ✅ Correct (nog niet gegenereerd) |
| Legacy foto | aanwezig | ✅ |
| Legacy in tenue | aanwezig | ✅ |
| Then vs Now | aanwezig | ✅ |
| **Totaal** | **7/9** | Was 2/5 → nu 7/9 |

### Chris Eikelboom (lid zonder assets) — ✅ Geen false positives

| Asset | Status |
|-------|--------|
| Avatar | Initialen "CE" |
| Alle rijen | ontbreekt |
| **Totaal** | **0/9** |

### Harrie Kiezebrink (lid met media.profile.url) — ✅ Existing path werkt

| Asset | Status |
|-------|--------|
| Upload | aanwezig (via media.profile.url) |
| Fullbody/Close-up/Intro | aanwezig |
| Actiefoto | aanwezig |
| **Totaal** | **5/9** |

---

## 3. Code Review

### ✅ Goed

- **Design tokens**: Consistent gebruik van `--space-*`, `--app-*`, `--radius-*`, `--duration-*` — geen hardcoded waarden
- **WCAG 2.1 AA**: Touch targets ≥ 44px, `:focus-visible` op alle interactieve elementen, `aria-labels` aanwezig
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` correct geïmplementeerd
- **Dark mode**: Alle kleuren via semantic tokens
- **Mobile-first**: Component werkt goed op mobiel viewport (375px geverifieerd)
- **Role-strict variant zoeken**: `ROLE_KIT_MAP` voorkomt cross-role contaminatie
- **Media alias fallbacks**: Correct geïmplementeerd als vangnet voor flat-format data

### ⚠️ Aandachtspunten

| # | Probleem | Impact | Aanbeveling |
|---|----------|--------|-------------|
| 1 | **TSX bestand 643 regels** (richtlijn: max 500) | Moeilijker te onderhouden | Verplaats helpers (`memberAvatarUrl`, `getFirstAssetUrl`, `hasAnyVariant`, `getLegacyPhotoUrl`, `buildAssetChecklist`) naar apart bestand |
| 2 | **CSS module 416 regels** (richtlijn: max 150) | Lastig navigeren | Split in sub-modules: `checklist.module.css`, `accordion.module.css` |
| 3 | **Losse `SquadMember.user` type** | `avatar_url` wordt via `Record<string, unknown>` cast benaderd | Voeg `avatar_url?: string` toe aan `SquadMember.user` interface |
| 4 | **`object-position: top` op alle thumbnails** | Goed voor fullbody, maar kan onderkant van close-ups afsnijden | Overweeg `object-position` per asset type te variëren |
| 5 | **Presigned URL expiry** (24u) voor avatars | Upload thumbnail kan stale worden bij langdurig open sheets | Geen directe actie nodig — aanvaardbaar risico |

---

## 4. Architectuur-aanbevelingen

### A) Data-integriteit: Sync `media.profile.url` bij avatar upload (★ aanbevolen)

**Probleem**: De upload flow schrijft naar `User.avatar` maar de `media.profile.url` in membership metadata wordt niet bijgewerkt. Dit veroorzaakte de lege Upload-rij.

**Huidige workaround**: Frontend leest nu `user.avatar_url` als fallback.

**Structurele fix**:
- Na succesvolle avatar upload, ook `membership.metadata.teamreel_assets.media.profile.url` updaten
- Eén bron van waarheid voor upload status
- Vermindert complexiteit in frontend

### B) Type-safety verbeteren

```typescript
// In squadTabTypes.ts — voeg avatar_url toe:
user?: {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;  // ← nieuw
};
```

Dit elimineert de `Record<string, unknown>` cast in MemberSummarySheet.

### C) Component opsplitsen (bij volgende refactor)

```
MemberSummarySheet.tsx          → Component shell + state
├── memberAssetHelpers.ts       → Alle helper functies
├── MemberChecklist.tsx         → Checklist rendering
└── MemberSummarySheet.module.css (kleiner)
```

---

## 5. Volgende stappen

| Prioriteit | Actie | Effort |
|-----------|-------|--------|
| 🟡 | `avatar_url` toevoegen aan `SquadMember.user` type | ~15 min |
| 🟡 | Helpers uit TSX naar apart bestand verplaatsen | ~30 min |
| 🟢 | Backend: sync `media.profile.url` bij avatar upload | ~1 uur |
| 🟢 | CSS module opsplitsen | ~30 min |
| 🟢 | `object-position` per asset type configureren | ~15 min |

---

## Screenshots

- `harold-summary-sheet-upload-fix.png` — Harold: Upload aanwezig + alle assets correct
- `harold-fullbody-expanded.png` — Fullbody accordion met 3 kit variants
- `harrie-summary-sheet.png` — Harrie: Upload via media.profile.url path
