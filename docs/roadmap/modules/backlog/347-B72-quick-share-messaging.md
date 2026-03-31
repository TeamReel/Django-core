# 347 — B72 — Quick Share (Messaging)

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend + Frontend (TeamReel Product Feature) |
| Impact | 🔴 critical |
| Effort | ~20 uur |

## Wat

One-tap delen van gegenereerde content naar WhatsApp, Telegram en andere messaging-apps via native share APIs en deep links. ShareLink model met short codes, publieke preview pagina's met Open Graph meta tags voor rich previews, auto-generated captions per content type, en view/share tracking.

## Waarom belangrijk

Amateur clubs communiceren via WhatsApp-groepen, niet via Instagram. De snelste weg naar adoptie is content direct deelbaar maken in het kanaal waar het team al zit. Een coach maakt een line-up → tikt op "Delen" → gaat direct de WhatsApp-groep in. Geen download, geen extra app, geen link kopiëren.

## Past in TeamReel / CoreApp

- **TeamReel**: Dit is de core distributie-feature. WhatsApp is het primaire communicatiekanaal van amateurclubs. Rich previews (afbeelding + tekst in WhatsApp) making content viral — teamleden delen het verder.
- **CoreApp**: Short link generatie + OG meta tags + public preview pages zijn generiek. Het share pattern (deep links per platform) is herbruikbaar voor elk product dat content deelt via messaging.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B72-quick-share-messaging

We bouwen quick share functionaliteit voor de Django 5 backend + React 18 frontend.

[feature summary]
One-tap sharing naar WhatsApp/Telegram via short links, rich previews, en auto-generated captions.

[goals]
- ShareLink model: content GenericFK, short_code (8 chars, unique), view_count, share_count
- Public preview page: /s/{short_code} — lightweight, geen login, mobile-optimized
- Open Graph meta tags voor rich previews in WhatsApp/Telegram
- Share targets: WhatsApp (deep link), Telegram (deep link), Clipboard, Web Share API
- Auto-generated captions per content type (line-up, uitslag, video)
- View/share tracking zonder login

[non-goals]
- In-app messaging/chat
- Email sharing (dat is standaard)
- Social media publishing (dat is B54)
- Link shortener als standalone service

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Frontend: React 18, TypeScript
- Content: GenericFK naar diverse content models
- Media: FileAsset model voor images/video URLs
- Public pages: Django template of SSR voor OG tags
- Tests: pytest (backend) + Playwright (share flow)
```

### Plan

```
/spec-kitty.plan feature=B72-quick-share-messaging

[tech choices]
- Short codes: crypto.get_random_string(8, 'abcdefghjkmnpqrstuvwxyz23456789') — geen verwarrende chars
- Public page: Django view (server-rendered) voor OG meta tags (niet React SPA)
- OG tags: og:title, og:description, og:image, og:type — per content type
- Share targets: URL-gebaseerde deep links (geen SDK nodig)
- Caption: Python template per content type
- Tracking: simple counter update (atomic F() expression)
- Frontend: ShareButton component met dropdown voor targets

[models]
- ShareLink: content_type, object_id, short_code (unique, db_index), created_by FK, view_count, share_count, expires_at (nullable)

[api endpoints]
- POST /api/v1/share/ — maak share link
- GET /api/v1/share/{short_code}/ — share link details
- GET /s/{short_code} — public preview (Django view, niet API)
- GET /api/v1/share/{short_code}/stats/ — view/share counts

[frontend components]
- ShareButton — dropdown met WhatsApp, Telegram, Clipboard, Native Share
- ShareModal — preview + caption editing + share targets

[files to create]
- src/sharing/ — nieuwe Django app
- src/sharing/views.py — public preview view (Django template)
- src/sharing/templates/ — OG meta tag templates
- demo/src/components/share/ShareButton.tsx + .module.css
- tests/test_sharing/
```

### Research

```
/spec-kitty.research feature=B72-quick-share-messaging

Onderzoek de volgende punten:

1. Welke content types moeten deelbaar zijn? Check src/ voor content/generation models.
2. Hoe worden media URLs gegenereerd? Check FileAsset model (src/files/) voor publieke URLs.
3. Zijn er al publieke/ongeauthenticeerde URLs in de app? Hoe is URL routing opgezet?
4. Welke WhatsApp deep link formaten werken op iOS en Android?
5. Wat zijn de OG meta tag vereisten voor rich previews in WhatsApp?
```
