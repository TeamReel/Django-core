# 349 — F32 — Public Club Feed & Embed Widget

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend + Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~25 uur |

## Wat

Publieke pagina per club (`/club/{slug}`) die alle gepubliceerde content toont, plus een embeddable widget (`/embed/{slug}`) voor clubwebsites. Club branding (logo, kleuren), responsive grid layout, Open Graph meta tags, en een embed code generator. Geen login vereist — viral loop voor nieuwe club-acquisitie.

## Waarom belangrijk

Clubs willen hun content tonen op hun eigen website en delen met leden die geen TeamReel-account hebben. Een publieke feed is ook marketing: "Kijk wat die club maakt met TeamReel" overtuigt nieuwe clubs om zich aan te melden. Het embed widget maakt TeamReel onzichtbaar aanwezig op 100+ clubwebsites.

## Past in TeamReel / CoreApp

- **TeamReel**: Directe groeistrategie. Publieke feeds maken content zichtbaar buiten de app. Embed widgets op clubwebsites creëren een viral loop — elk clubwebsite-bezoeker ziet TeamReel-content. SEO-voordeel door publieke, indexeerbare pagina's.
- **CoreApp**: Public content feeds + embed widgets zijn een generiek pattern voor content platforms. De architectuur (publieke API, OG tags, iframe-safe rendering) is herbruikbaar.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=F32-public-club-feed

We bouwen publieke club feeds en embed widgets in Django 5 + React 18.

[feature summary]
Publieke club pagina met content feed, embed widget voor clubwebsites, en SEO-optimized rendering.

[goals]
- Public club page: /club/{slug} — alle gepubliceerde content, club branding, responsive grid
- Embed widget: /embed/{slug} — iframe-friendly, compact layout, configureerbaar
- PublicProfile: slug, public_name, is_public toggle, show_sponsors
- Content filtering: alleen published + approved content
- Open Graph meta tags + structured data voor SEO
- Embed code generator in dashboard
- Rate limiting op publieke endpoints
- Geen member data zichtbaar op publieke pagina

[non-goals]
- User comments op publieke feed
- Social login/registration via feed
- Custom domain per club (dat is B77)
- RSS/Atom feed

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Frontend: React 18, TypeScript, Vite
- Public pages: Django views voor OG tags (SSR), React voor interactie
- Branding: BrandProfile model (src/branding/)
- Content: published content via generative models
- Tests: pytest (backend) + Playwright (public pages)
```

### Plan

```
/spec-kitty.plan feature=F32-public-club-feed

[tech choices]
- Public page: Django view (SSR voor OG tags) + React SPA hydration
- Embed: separate lightweight page, X-Frame-Options: ALLOWALL
- Embed config: query params (?items=10&layout=grid&theme=light)
- Content API: public ViewSet (geen auth, read-only, filtered op published)
- Branding: BrandProfile kleuren als CSS custom properties in public page
- Rate limiting: django-ratelimit op public endpoints

[models]
- PublicClubProfile: org FK, slug (unique), public_name, public_description, is_public, show_sponsors, items_per_page

[api endpoints]
- GET /api/v1/public/club/{slug}/ — club profiel (public)
- GET /api/v1/public/club/{slug}/feed/ — paginated content feed
- GET /api/v1/public/club/{slug}/feed/{id}/ — single content item
- PUT /api/v1/club/public-settings/ — configureer public profile (auth)

[pages/views]
- /club/{slug} — Django view (OG tags) + React feed component
- /embed/{slug} — lightweight embed view
- demo/src/pages/PublicClubFeed.tsx
- demo/src/components/embed/EmbedWidget.tsx

[files to create]
- src/public_feed/ — nieuwe Django app (of uitbreiding van branding)
- demo/src/pages/PublicClubFeed.tsx + .module.css
- demo/src/components/embed/EmbedWidget.tsx + .module.css
- tests/test_public_feed/
```

### Research

```
/spec-kitty.research feature=F32-public-club-feed

Onderzoek de volgende punten:

1. Hoe werkt het BrandProfile model? Zijn er al publieke profiel-velden (slug, public_name)?
2. Welke content models hebben een "published" status? Hoe is de publish-flow?
3. Zijn er al publieke/ongeauthenticeerde API endpoints?
4. Hoe werkt server-side rendering in het huidige project? Is er een Django template systeem actief?
5. Welke clubwebsite platforms zijn populair bij amateurclubs? (voor embed widget compatibiliteit)
```
