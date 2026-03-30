# U1 — Deep-link & Share

**Status:** ✅ Done
**Track:** U — UX Flow Verbeteringen
**Effort:** 4 uur
**Dependencies:** R1 (route constants — canonical URLs)

---

## Doel

Elke detail-pagina krijgt een "Deel" functionaliteit: copy canonical URL naar clipboard, en optioneel QR-code voor match-day content sharing.

## Huidige Staat

- URLs zijn canonical en shareable (vanity URLs werken)
- **Geen UI** om URLs te kopiëren of delen
- Gebruikers moeten handmatig de browser-balk kopiëren
- Op mobile is de URL-balk vaak verborgen

## Target

### Copy-to-clipboard op alle detail pages

```
[🔗 Deel] → kopieert https://app.teamreel.io/knvb/fc-utrecht/u19/2025-26
```

### QR-code voor match pages

```
[📱 QR] → toont QR-code die scant naar de match-detail page
```

**Use case:** Coach print QR-code op matchday poster → ouders scannen → zien match-content direct op telefoon.

## Scope

### 1. Creëer `<ShareButton>` component

```tsx
interface ShareButtonProps {
  url?: string;        // default: huidige canonical URL
  title?: string;      // voor native share API
  showQR?: boolean;    // toon QR-code optie
}

function ShareButton({ url, title, showQR }: ShareButtonProps) {
  const location = useLocation();
  const shareUrl = url || `${window.location.origin}${location.pathname}`;

  // Desktop: copy to clipboard
  // Mobile: native Share API (navigator.share)
  // QR: modal met QR-code (optioneel)
}
```

### 2. Native Share API (mobile)

```tsx
if (navigator.share) {
  await navigator.share({
    title: title || 'TeamReel',
    url: shareUrl,
  });
} else {
  await navigator.clipboard.writeText(shareUrl);
  toast.success('Link gekopieerd');
}
```

### 3. QR-code component

Gebruik lightweight library (`qrcode.react` of `qr-code-styling`):

```tsx
function QRModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <QRCode value={url} size={256} />
      <p className="text-sm text-muted">Scan om direct naar deze pagina te gaan</p>
    </Modal>
  );
}
```

### 4. Integratie in detail pages

Toevoegen aan action-bar / header van:
- `MatchDetailPage` — share + QR
- `SeasonDetailPage` — share
- `TeamDetailPage` — share
- `ClubDetailPage` — share
- `OrganisationDetailPage` — share

## Acties

1. [x] Creëer `demo/src/components/ShareButton.tsx` + `ShareButton.module.css`
2. [x] Implementeer clipboard copy + native Share API fallback
3. [x] Evalueer QR library → No external dependency, inline SVG generator
4. [x] Creëer `QRModal` component (voor match pages)
5. [x] Integreer ShareButton in 5 detail pages (Match, Season, Team, Club, Org)
6. [x] Toast feedback bij copy ("Gekopieerd" state indicator)
7. [x] Test op mobile (native share dialog) en desktop (clipboard)

## Verificatie

- [x] Share button zichtbaar op Match, Season, Team, Club, Org pages
- [x] Desktop: klik → URL in clipboard + feedback
- [x] Mobile: klik → native share dialog
- [x] Match page: QR-code optie beschikbaar (showQR={true})
- [x] QR-code leidt naar correcte canonical URL
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (984 tests, 11 new)
- [x] Gecommit + gepusht

## Implementatie

- `demo/src/components/ShareButton.tsx` — Main component (225 lines)
- `demo/src/components/ShareButton.module.css` — Styling
- `demo/src/components/ShareButton.test.tsx` — 11 tests
- Integrated in: MatchDetailPage, ProjectSeasonDetailPage, TeamOrganisationDetailPage, ClubOrganisationDetailPage, OrganisationDetailPage
