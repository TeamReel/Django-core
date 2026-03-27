# U2 — alert() Migratie

**Track:** U — UX Modernisatie
**Status:** 📋 Todo
**Geschatte effort:** 4 uur
**Dependency:** U1 (Toast systeem)

---

## Doel

Alle 80 `alert()` calls in 39 files vervangen door `toast.*` calls.

## Top Bestanden

| Bestand | `alert()` hits | Type |
|---------|---------------:|------|
| `pages/identity/useOrgActions.ts` | **5** | Error + success feedback |
| `pages/identity/UserDetailMembershipTabs.tsx` | **5** | Confirmations + errors |
| `pages/identity/useUserDetailApi.ts` | **4** | API error feedback |
| `components/AssetsTab/useAssetAutoProcessing.ts` | **4** | Processing status |
| `pages/identity/directory/useUsersListData/handlers.ts` | **4** | Bulk action feedback |
| `components/FeatureFlags/.../useContentAvailabilityData.ts` | **4** | Availability errors |
| `pages/identity/useProjectsPageData.ts` | **3** | Project action feedback |
| + 32 files met 1-2 hits elk | ~51 | Mixed |

## Aanpak

1. Categoriseer per alert type:
   - **Error alert** → `toast.error(message)`
   - **Success alert** → `toast.success(message)`
   - **Confirm alert** → `ConfirmDialog` component (future) of `window.confirm` → toast
2. Werk top-6 bestanden eerst af (25 hits = 31%)
3. Sweep overige 33 files
4. Grep verify: 0 `alert(` matches

## Acceptatiecriteria

- [ ] 0 `alert()` calls in productiebestanden
- [ ] Alle feedback via `toast.*` calls
- [ ] Error messages behouden (niet verliezen)
- [ ] UX consistent: success = groen, error = rood
- [ ] Tests aangepast waar nodig
