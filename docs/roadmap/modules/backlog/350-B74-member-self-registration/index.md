# B74: Member Self-Registration

**Priority:** 🔥 Bouwen
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 350
**Category:** Backend (TeamReel Product Feature)

## Description

## 350. B74 – Member Self-Registration

**Doel**: Teamleden kunnen zichzelf aanmelden via een uitnodigingslink, zonder dat een admin elk lid handmatig moet toevoegen.

**Waarom TeamReel**: Een club heeft 200+ leden. Handmatig toevoegen is een dealbreaker. Met een uitnodigingslink per team kan een coach de link in de WhatsApp-groep gooien en iedereen meldt zichzelf aan met naam, foto en rugnummer.

**Wat moet er gebeuren**:

### InviteLink Model
- **InviteLink model**:
  - Fields: project FK, token (unique, URL-safe), created_by (User FK)
  - Config: default_role (player/coach/staff), max_uses (optioneel), expires_at (optioneel)
  - Stats: use_count, last_used_at
  - Status: active, expired, revoked

### Self-Registration Flow
1. Coach/admin maakt invite link aan voor team
2. Link wordt gedeeld via WhatsApp/email: `https://app.teamreel.app/join/{token}`
3. Nieuw lid opent link → registratieformulier
4. Velden: naam, email, foto (optioneel), rugnummer (optioneel), positie (optioneel)
5. Account wordt aangemaakt + Member record + ProjectMembership met default role
6. Optioneel: admin approval vereist voordat lid actief is
7. Bevestigingsmail met link naar team in de app

### Registration Form (context-aware)
- Formulier toont club/team branding (logo, kleuren)
- Sport-specifieke velden op basis van project sport_type
  - Voetbal: rugnummer, positie, voet (links/rechts)
  - Hockey: rugnummer, positie
  - Generiek: alleen naam + email
- Optioneel: profielfoto upload (resize + crop)

### Permissions & Safety
- Invite link alleen aanmaakbaar door project admin of coach
- Rate limiting op registratie endpoint (max 50 per uur per link)
- Email verification vereist
- Duplicate detection (email al in project → melding)
- Admin kan pending members goedkeuren of afwijzen

### Integration
- B05 (account creation)
- B06/B07 (organisation/project membership)
- B08 (role assignment)
- B17 (notificatie naar admin bij nieuwe registratie)
- B22 (profielfoto upload)

**Scope**: 🔧 **Backend + Frontend** (Django app + React registration form + tests)

**API Endpoints**:
- `POST /api/v1/invites/` — Maak invite link voor project
- `GET /api/v1/invites/` — Lijst van actieve invite links
- `DELETE /api/v1/invites/{id}/` — Revoke invite link
- `GET /api/v1/join/{token}/` — Get invite details (public, voor registratieformulier)
- `POST /api/v1/join/{token}/` — Registreer via invite
- `GET /api/v1/invites/{id}/members/` — Leden geregistreerd via deze link

**Status**: 📋 ROADMAP
