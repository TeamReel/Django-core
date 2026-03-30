# B77: White-label Federatie Portal

**Priority:** 🟡 Belangrijk
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 354
**Category:** Backend + Frontend (TeamReel Growth)

## Description

## 354. B77 – White-label Federatie Portal

**Doel**: Federaties en bonden kunnen TeamReel onder eigen merk aanbieden aan hun aangesloten clubs — met eigen domein, logo, kleuren en club-overzicht.

**Waarom TeamReel**: Het businessplan noemt "Partners / Bonden: Whitelabel / API-integratie, op maat" als derde revenue segment. De bestaande multi-tenant architectuur (Organisation → Project) ondersteunt al een federatie-niveau, maar er is geen white-label laag.

**Wat moet er gebeuren**:

### WhitelabelConfig Model
- **WhitelabelConfig model**:
  - Fields: organisation FK (de federatie), custom_domain (nullable), subdomain_slug
  - Branding: logo, favicon, primary_color, secondary_color, app_name
  - Features: enabled_features (JSONField), hide_teamreel_branding (bool)
  - Status: active, pending_dns, disabled

### DNS & Routing
- **Custom domain support**:
  - Subdomain: `{slug}.teamreel.app` (standaard)
  - Custom domain: `content.knvb.nl` (via CNAME)
  - Middleware: resolve domain → WhitelabelConfig → set org context
- **SSL**: automatisch via Railway/Vercel wildcard of Let's Encrypt

### Federatie Dashboard
- **Overzichtspagina**: federatie ziet alle aangesloten clubs
  - Clubs met actieve abonnementen
  - Content statistieken per club
  - Totaal verbruik en generaties
- **Club onboarding**: federatie kan clubs uitnodigen met vooraf ingesteld plan

### Branding Override
- **Theme injection**:
  - WhitelabelConfig kleuren overschrijven CSS tokens op runtime
  - Logo/favicon dynamisch laden op basis van domein
  - "Powered by TeamReel" footer (tenzij `hide_teamreel_branding` aan)
- **Email templates**: federatie branding in transactional emails

### API voor Bonden
- **Read-only API** voor bond-systemen:
  - Clubs overzicht met stats
  - Content feed per club (voor bond-website integratie)
  - Usage/billing rapportage
- **Authenticatie**: API key per WhitelabelConfig

### Afhankelijkheden
- `organisations` app (federatie = Organisation met type=federation)
- `branding` app (BrandProfile — bestaand, uitbreiden met whitelabel override)
- `settings` app (OrganisationSettings)
- B76 Abonnement & Planbeheer (federatie beheert plannen voor clubs)

### Scope & Effort
- **Effort**: ~60 uur
- **Lagen**: Backend models + middleware + API, Frontend theme injection, DNS configuratie
- **Risico**: Custom domains vereisen infra-wijzigingen (Railway custom domains). Start met subdomain-only, custom domains in fase 2.
