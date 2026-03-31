# 354 — B77 — White-label Federatie Portal

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend + Frontend (TeamReel Growth) |
| Impact | 🟡 important |
| Effort | ~60 uur |

## Wat

Federaties en bonden kunnen TeamReel onder eigen merk aanbieden: WhitelabelConfig model met custom domain/subdomain, branding (logo, favicon, kleuren, app naam), feature toggles, en hide_teamreel_branding optie. Federatie dashboard met overzicht van aangesloten clubs, content stats, en club onboarding. API keys voor bond-systemen.

## Waarom belangrijk

Het businessplan beschrijft "Partners / Bonden: Whitelabel / API-integratie, op maat" als derde revenue segment — de hoogste ARPU. Een bond als de KNVB of KNHB die TeamReel aanbiedt aan 3000 clubs = massive schaal zonder per-club acquisitiekosten. White-label maakt dit commercieel aantrekkelijk voor bonden.

## Past in TeamReel / CoreApp

- **TeamReel**: Directe business impact. Eén deal met een sportbond = 100-3000 clubs via één contract. De multi-tenant architectuur ondersteunt al een federatie-niveau (Organisation hiërarchie). White-label is de commerciële laag eroverheen.
- **CoreApp**: Multi-tenant white-label is een generiek enterprise pattern. Subdomain routing, theme injection, en API key management zijn herbruikbaar voor elk B2B2C platform.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B77-whitelabel-federation-portal

We bouwen white-label federation support in Django 5 + DRF + React 18.

[feature summary]
White-label configuratie per federatie met custom domain/subdomain, branding override, club overzicht, en API voor bond-systemen.

[goals]
- WhitelabelConfig model: org FK, subdomain_slug, custom_domain (nullable), branding (logo/favicon/kleuren/app_name), feature toggles, hide_teamreel_branding
- Subdomain routing: {slug}.teamreel.app (standaard), custom domain via CNAME (fase 2)
- Middleware: resolve domain → WhitelabelConfig → set org context
- Theme injection: CSS custom properties override op basis van config
- Federatie dashboard: aangesloten clubs, content stats, abonnement overzicht
- Club onboarding: federatie nodigt clubs uit met vooraf ingesteld plan
- API keys: read-only API voor bond-systemen (clubs overzicht, content feed, usage)
- "Powered by TeamReel" footer (tenzij hide_teamreel_branding)

[non-goals]
- Custom domain SSL provisioning (fase 2)
- Per-federatie feature development (custom code)
- Federatie-specifieke branding API
- White-label email sender domains

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Organisations: bestaand model met hiërarchie-potentieel
- Branding: BrandProfile model (src/branding/)
- Frontend: React 18, TypeScript, CSS custom properties
- Deploy: Railway (subdomain routing), Vercel (frontend)
- Tests: pytest + factory_boy, Playwright
```

### Plan

```
/spec-kitty.plan feature=B77-whitelabel-federation-portal

[tech choices]
- Subdomain routing: Django middleware die Host header parsed → WhitelabelConfig lookup
- Theme: CSS custom properties via inline <style> in base template/React root
- API keys: UUID-based API key in WhitelabelConfig, verified via custom DRF authentication
- Cache: Redis voor WhitelabelConfig lookup (domain → config, TTL 5 min)
- Federation type: Organisation.type = 'federation' (nieuw veld of aparte bool)

[models]
- WhitelabelConfig: org FK (federation), subdomain_slug (unique), custom_domain (nullable, unique), branding (JSON: logo_url, favicon_url, primary_color, secondary_color, app_name), enabled_features (JSON), hide_teamreel_branding, api_key (UUID), status
- FederationClubLink: federation_org FK, club_org FK, plan FK (nullable), invited_at, joined_at

[api endpoints]
- GET /api/v1/federation/clubs/ — aangesloten clubs (federation admin)
- POST /api/v1/federation/invite-club/ — club uitnodigen
- GET /api/v1/federation/stats/ — aggregate content stats
- GET /api/v1/federation/config/ — whitelabel configuratie
- PATCH /api/v1/federation/config/ — config wijzigen
- GET /api/v1/external/clubs/ — externe API (API key auth)
- GET /api/v1/external/clubs/{id}/feed/ — externe content feed

[files to create]
- src/whitelabel/ — nieuwe Django app
- src/whitelabel/middleware.py — domain resolution middleware
- src/whitelabel/authentication.py — API key auth backend
- demo/src/hooks/useWhitelabelTheme.ts — theme injection hook
- demo/src/pages/FederationDashboard.tsx
- tests/test_whitelabel/
```

### Research

```
/spec-kitty.research feature=B77-whitelabel-federation-portal

Onderzoek de volgende punten:

1. Hoe is het Organisation model opgebouwd? Is er al een type/hiërarchie veld? Check src/organisations/models.py.
2. Hoe werkt subdomain routing op Railway? Zijn wildcard subdomains geconfigureerd?
3. Hoe zijn CSS custom properties/design tokens opgezet in de frontend? Check demo/src/styles/.
4. Welke middleware bestaat er al? Hoe is de Django middleware stack geconfigureerd?
5. Hoe worden API keys/tokens nu afgehandeld in DRF authentication?
```
