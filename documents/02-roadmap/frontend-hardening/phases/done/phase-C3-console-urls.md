# C3 — Console & Hardcoded URLs

**Status:** ✅ Done
**Effort:** 1 uur (geschat 2 uur)
**Scope:** Console statements + hardcoded URLs + dangerouslySetInnerHTML

---

## Doel

Console.* verwijderen, hardcoded URLs centraliseren, dangerouslySetInnerHTML sanitizen.

## Resultaat

### Console statements (0 productie-issues)
Oorspronkelijke metric van 9 was al opgelost in eerdere roadmaps. Alle `console.*` calls zitten in:
- `utils/logger.ts` — de logger utility zelf (intentional)
- Test files — niet productie-code

### Hardcoded S3 URLs → `getAssetUrl()` (7 files)
`brandProfileConstants.ts` had al een `getAssetUrl()` helper met correcte URL-encoding.
6 andere files dupliceerden deze logica met hardcoded `https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/`.

| File | Actie |
|------|-------|
| `brandProfileConstants.ts` | Exported `S3_ASSET_BASE_URL` constant |
| `teamSelectieHelpers.ts` | Removed duplicate `S3_BASE` + `toFullUrl()`, import `getAssetUrl` |
| `ClubKitsTab.tsx` | `getKitImageUrl` → one-liner met `getAssetUrl` |
| `KitsTab.tsx` | `getKitImageUrl` → one-liner met `getAssetUrl` |
| `EditClubModal.tsx` | Inline S3 URL → `getAssetUrl(storagePath)!` |
| `useEntityEditData.ts` | Inline S3 URL → `getAssetUrl(storagePath)` |
| `effects.ts` | 3-line if/else → `getAssetUrl(url)!` |
| `MemberIdentityTab.tsx` | Hardcoded prefix → `S3_ASSET_BASE_URL` constant |

### DocsPage URLs (2 fixes)
- `http://localhost:8001/docs` → `VITE_DOCS_URL` env var met DEV-only fallback
- `https://github.com` → `VITE_GITHUB_URL` env var met correct repo URL default

### dangerouslySetInnerHTML → sanitized (3 fixes)
Alle 3 instances renderen `result.highlight` (Django SearchHeadline `<mark>` tags).
- Created `utils/sanitize.ts` met `sanitizeHighlight()` — strips alles behalve `<mark>`
- Applied in `SearchBar.tsx` (1×) en `SearchPage.tsx` (2×)

### Acceptable remaining
- `apiBase.ts` — `https://api.teamreel.app` production fallback (behind env var check)
- `ClubAssetsTab.tsx` — `https://example.com/...` placeholder text in input
- `IdentitySettingsCard.tsx` — `https://…` placeholder text
- `WebSocketTestPage.tsx` — dev-only test page
- Test files — mock URLs

## Verificatie

- [x] 0 `console.*` in productie-code (was al 0)
- [x] 0 hardcoded S3 URLs (7 files → `getAssetUrl()`)
- [x] 0 `dangerouslySetInnerHTML` zonder sanitizer
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (123 files, 529 tests)
