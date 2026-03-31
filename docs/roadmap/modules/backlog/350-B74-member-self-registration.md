# 350 — B74 — Member Self-Registration

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend + Frontend (TeamReel Product Feature) |
| Impact | 🔴 critical |
| Effort | ~25 uur |

## Wat

Teamleden kunnen zichzelf aanmelden via een uitnodigingslink — zonder dat een admin elk lid handmatig toevoegt. InviteLink model met token, default role, max uses en expiry. Coach deelt link in WhatsApp-groep → leden vullen naam, email, foto en rugnummer in → account + Member + ProjectMembership wordt automatisch aangemaakt.

## Waarom belangrijk

Een club heeft 200+ leden. Handmatig toevoegen is de #1 reden dat clubs afhaken bij onboarding. Met een uitnodigingslink kan een coach de link in de WhatsApp-groep gooien en iedereen meldt zichzelf aan. Dat schaalt van 11 spelers naar 200 leden zonder extra werk voor de admin.

## Past in TeamReel / CoreApp

- **TeamReel**: Directe onboarding-versnelling. De WhatsApp-groep van elk team is het distributiekanaal. Sport-specifieke velden (rugnummer, positie) maken registratie context-aware. Club branding op het registratieformulier versterkt de identiteit.
- **CoreApp**: Invite-link registratie is een universeel SaaS-pattern (Slack, Notion, etc.). Het model (InviteLink + self-registration + default role) is herbruikbaar voor elke multi-tenant applicatie.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B74-member-self-registration

We bouwen self-registration via invite links in Django 5 + DRF + React 18.

[feature summary]
Invite link systeem waarmee teamleden zichzelf aanmelden met naam, email, foto en sport-specifieke gegevens.

[goals]
- InviteLink model: project FK, token (URL-safe), default_role, max_uses, expires_at
- Self-registration flow: /join/{token} → registratieformulier → account + Member + membership
- Context-aware formulier: club branding, sport-specifieke velden (rugnummer, positie)
- Permissions: alleen project admin/coach maakt invite links
- Safety: rate limiting (max 50/uur/link), email verification, duplicate detection
- Admin approval optie: pending members wachten op goedkeuring

[non-goals]
- Social login (Google, Facebook)
- Bulk member import (dat is B45)
- Team management interface (dat is bestaande functionaliteit)

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Frontend: React 18, TypeScript voor registratieformulier
- Auth: bestaand user/account model (src/accounts/)
- Members: bestaand Member model (src/members/)
- Organisations/Projects: bestaande models (src/organisations/, src/projects/)
- Sport config: bestaand sport_configuration model (5 models)
- Tests: pytest + factory_boy (backend), Playwright (registration flow)
```

### Plan

```
/spec-kitty.plan feature=B74-member-self-registration

[tech choices]
- Token: crypto.get_random_string(32, 'abcdefghjkmnpqrstuvwxyz23456789')
- Registration: transactional — User + Member + ProjectMembership in één atomic block
- Branding: InviteLink bevat project FK → BrandProfile voor formulier styling
- Sport fields: dynamisch op basis van project.sport_type
- Email verification: Django allauth of custom verification flow
- Rate limiting: django-ratelimit op /join/{token}/ endpoint

[models]
- InviteLink: project FK, token (unique), created_by FK, default_role (enum), max_uses, use_count, expires_at, status (active/expired/revoked)

[api endpoints]
- POST /api/v1/invites/ — maak invite link
- GET /api/v1/invites/ — lijst actieve links (project admin)
- DELETE /api/v1/invites/{id}/ — revoke link
- GET /api/v1/join/{token}/ — invite details + formulier config (public)
- POST /api/v1/join/{token}/ — registreer via invite (public)
- GET /api/v1/invites/{id}/members/ — via deze link geregistreerd

[frontend]
- demo/src/pages/JoinPage.tsx — registratieformulier
- demo/src/components/registration/SportFields.tsx — sport-specifieke velden

[files to create]
- src/invites/ — nieuwe Django app
- demo/src/pages/JoinPage.tsx + .module.css
- tests/test_invites/
- demo/tests/registration.spec.ts — E2E test
```

### Research

```
/spec-kitty.research feature=B74-member-self-registration

Onderzoek de volgende punten:

1. Hoe ziet het Member model eruit? (src/members/models.py) Welke velden heeft het?
2. Hoe werkt het User/Account model? Check src/accounts/ voor authenticatie flow.
3. Hoe worden rollen/permissions toegekend? Check ProjectMembership of vergelijkbaar model.
4. Welke sport_configuration models bestaan er? (sport-specifieke registration fields)
5. Is er al een registratie/signup flow in de frontend? Check demo/src/ voor auth pages.
```
