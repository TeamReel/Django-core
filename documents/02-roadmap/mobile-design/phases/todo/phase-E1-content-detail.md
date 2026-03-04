# Phase E1 — Content Detail Page

**Track:** E (Content Flow)
**Status:** 📋 Planned

## Doel

Volledige content detail pagina met full-size preview, video player, metadata en acties.

## Taken

- [ ] Route: `/content/:id` of `/studio/:id`
- [ ] Full-size media preview (video player of afbeelding)
- [ ] Metadata card: match, type, template, status, aanmaakdatum
- [ ] Actie knoppen: Download, Share, Approve, Reject, Regenerate
- [ ] Status badge prominent (pending/approved/rejected/generating)
- [ ] Related content: andere content van dezelfde match
- [ ] Mobile: media bovenaan (sticky), metadata scrollable onder
- [ ] Desktop: media links, metadata panel rechts

## Checklist

- [ ] Route en page component gebouwd
- [ ] Video player werkend
- [ ] Image preview werkend
- [ ] Metadata correct
- [ ] Actie knoppen werkend
- [ ] Related content getoond
- [ ] Responsive layout
- [ ] Loading/error/empty states
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
