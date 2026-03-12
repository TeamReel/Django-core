# Branding & Token Resolution

> Last updated: 2026-03-12

## Overview

De `branding` app beheert de visuele identiteit van clubs en teams: kleuren, logo's, tenues, en design tokens. Tokens **cascaderen** van organisatie → club → team via een merge-inheritence patroon.

**Kernwaarde:** Elk gegenereerd content-item (flyer, video, AI-asset) gebruikt automatisch de juiste clubkleuren en logo's.

---

## Data Model (3 models)

### BrandProfile

Eén brand per organisatie of project (XOR constraint).

| Veld | Type | Doel |
|------|------|------|
| `organisation` | FK → Organisation | Nullable — XOR met project |
| `project` | FK → Project | Nullable — XOR met organisation |
| `name` | CharField(200) | |
| `is_active` | bool | Soft-delete |

**Constraints:**
- `brand_profile_org_xor_project` — exact één van org/project gezet
- Unique brand per org, unique brand per project

**Key methods:**
- `get_tokens()` → `{key: value}` dict van eigen tokens
- `get_merged_tokens()` → org tokens + project overrides (merge)
- `get_effective_brand(org, project)` → project brand eerst, fallback naar org brand

### DesignToken

Key-value paren gekoppeld aan een BrandProfile.

| Veld | Type | Voorbeeld |
|------|------|-----------|
| `key` | CharField(100) | `primary_color`, `font_heading` |
| `value` | CharField(1000) | `#FF0000`, `Roboto` |
| `type` | choices | `color`, `font`, `spacing`, `other` |

**Well-known keys:** `primary_color`, `secondary_color`, `accent_color`, `font_heading`, `font_body`, `border_radius`.

### BrandAsset

Visuele bestanden (logo's, tenues, achtergronden) gekoppeld aan een profile.

| Veld | Type | Doel |
|------|------|------|
| `file` | FK → FileAsset | S3 bestand |
| `asset_type` | choices | 30+ types (zie onder) |
| `label` | CharField(100) | |
| `is_active` | bool | |

**Constraint:** unique `asset_type` per profile (behalve `club_background` — meerdere toegestaan).

**Asset types (selectie):**
- Logo's: `logo_primary`, `logo_secondary`, `logo_mono`
- Tenues: `kit_home`, `kit_away`, `kit_third`, `kit_gk`, `kit_coach` — elk met `_upload` (raw), processed (AI), `_combined` (kit+logo+sponsor)
- Achtergronden: `field_background`, `club_background`
- Overig: `sponsor_logo`, `stadium_photo`

---

## Token Resolution (Inheritance)

```
GET /api/v1/branding/resolve/?project=<uuid>&include_assets=true

Resolutie-volgorde:
1. Zoek project BrandProfile → tokens
2. Zoek organisation BrandProfile → tokens
3. Merge: project tokens overschrijven org tokens

Response:
{
  "source": "merged|project|organisation|none",
  "organisation_brand_id": "...",
  "project_brand_id": "...",
  "tokens": {
    "primary_color": "#FF0000",
    "secondary_color": "#0000FF",
    "font_heading": "Roboto"
  },
  "assets": { ... }  // optioneel: presigned S3 URLs
}
```

**Gebruik in generatie:** `BrandContextService.inject_brand_context()` roept deze resolutie aan om tokens in AI-prompts te injecteren.

---

## Auto-generate Tokens

```
POST /api/v1/branding/profiles/{id}/generate-tokens/
```

1. Download brand asset images (logo, kits) van S3
2. Extract dominante kleuren via Pillow quantization
3. Filter: near-white, near-black, desaturated kleuren verwijderd
4. Visuele afstand ≥40 tussen selecties
5. Upsert `primary_color`, `secondary_color`, `accent_color` tokens

---

## Auto-create bij Club Aanmaak

Bij het aanmaken van een club (Project met `parent_project=None`) maakt een `post_save` signal automatisch:
- BrandProfile voor het project
- 6 default DesignTokens: `primary_color=#1a1a2e`, `secondary_color=#16213e`, `accent_color=#e94560`, `font_heading=Inter`, `font_body=Inter`, `border_radius=8px`

---

## API Endpoints

| Methode | Endpoint | Doel |
|---------|----------|------|
| CRUD | `/branding/profiles/` | BrandProfile beheer |
| CRUD | `/branding/profiles/{id}/tokens/` | DesignToken beheer |
| POST | `/branding/profiles/{id}/generate-tokens/` | Auto-extract kleuren |
| CRUD | `/branding/profiles/{id}/assets/` | BrandAsset (logo's, kits) beheer |
| GET | `/branding/resolve/` | Token resolutie met inheritance |

---

## Gerelateerde docs

- [generative-pipeline.md](generative-pipeline.md) — BrandContextService injecteert tokens in AI-generatie
- [video-processing.md](video-processing.md) — Video pipeline gebruikt brand assets (logos, sponsors, field bg)
- [project-hierarchy.md](project-hierarchy.md) — Club → team hiërarchie (bepaalt token inheritance)
