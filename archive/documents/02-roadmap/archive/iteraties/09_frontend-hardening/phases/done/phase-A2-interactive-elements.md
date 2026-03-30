# A2 — Interactive Elements

**Status:** ✅ Done
**Effort:** 4 uur
**Scope:** 34 `<div onClick>` → semantische interactive elements

---

## Wat is gedaan

### 1. Overlay backdrops (17 divs)
- Verwijderd: `role="button" tabIndex={0}` (overlay is geen button)
- Keyboard-support via nieuw `useEscapeKey` hook (document-level)

### 2. Modal panels (14 divs)
- Verwijderd: `role="button" tabIndex={0}` (stopPropagation is geen interactie)
- Toegevoegd: `role="dialog"` voor screen reader semantiek

### 3. Interactive elements (2 divs → `<button>`)
- `ProfileHubPage.tsx`: avatar `<div role="button">` → `<button type="button" aria-label="Change profile photo">`
- `MatchCard.tsx`: card header `<div role="button">` → `<button type="button" aria-expanded={expanded}>`

### 4. Nieuw: `useEscapeKey` hook
- `hooks/useEscapeKey.ts` — document-level `keydown` listener voor Escape
- Accepts `onClose | undefined` (undefined = disabled, for conditional modals)
- Used in 15 modal components

### 5. ESLint guard
- `jsx-a11y/click-events-have-key-events` toegevoegd als `warn`

## Gewijzigde files

### Nieuw
- `hooks/useEscapeKey.ts`

### Overlays + panels + useEscapeKey (15 components)
- `components/NavbarCreditsModal.tsx`
- `components/NavbarNotificationsModal.tsx`
- `components/NavbarQuickReviewModal.tsx` (5 overlays, 4 panels)
- `components/BatchGenerationModal/BatchGenerationModal.tsx`
- `pages/identity/MemberBatchActionModal.tsx`
- `pages/identity/MemberEditSheet.tsx`
- `pages/identity/AddMemberModal/index.tsx`
- `pages/periods/CompetitionMembershipEditModal.tsx`
- `pages/periods/EditMemberModal.tsx`
- `pages/content/ContentCard.tsx`
- `pages/periods/MemberDetailPanel.tsx`
- `pages/aistudio/StudioCards.tsx`
- `pages/periods/ProjectSeasonMemberDetailPage.tsx`
- `pages/periods/VideoPreviewModal.tsx`
- `pages/periods/ThenVsNowModal/index.tsx`

### Interactive element conversions (2 components)
- `pages/ProfileHubPage.tsx` — avatar div → button
- `pages/periods/MatchCard.tsx` — card header div → button

### ESLint config
- `eslint.config.js` — added `jsx-a11y/click-events-have-key-events` warn

## Verificatie

- [x] 0 `<div onClick role="button">` patronen
- [x] `jsx-a11y/click-events-have-key-events` ESLint rule actief (warn)
- [x] 15 modals hebben Escape key support
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (529 tests)
