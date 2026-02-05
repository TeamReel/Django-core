# MediaItems & BrandAssets Seeding Proposal

> Version: 1.0
> Date: 2026-02-05
> Focus: Ajax, PSV, Feyenoord (Nederlandse Top 3)

## 📊 Huidige Data Structuur

### Clubs & Teams

| Club | Teams | Seasons | Squads (Participations) |
|------|-------|---------|-------------------------|
| **Ajax** | Ajax 1, Jong Ajax, Ajax O21, Ajax Vrouwen | Season 2024/2025 (+ historisch 2020-2024) | ~40 spelers per team |
| **PSV** | PSV 1, Jong PSV, PSV O21, PSV Vrouwen | Season 2024/2025 (+ historisch 2020-2024) | ~40 spelers per team |
| **Feyenoord** | Feyenoord 1, Feyenoord Reserves, Feyenoord O21, Feyenoord Vrouwen | Season 2024/2025 (+ historisch 2020-2024) | ~40 spelers per team |

### Bestaande MediaTags (78 tags)

**Relevant voor MediaItems:**
- `content_context`: member, season, pre-match, during-match, post-match
- `subject`: team, player, goalkeeper, coach, assistant, staff
- `moment`: lineup, flyer, goal, score-update, profile-photo, in-tenue, closeup, intro
- `status`: raw, edited, approved, published
- `media_type`: image, video
- `orientation`: portrait, landscape, square, story, reel
- `style`: classic, modern, minimal, bold, retro
- `platform`: instagram, tiktok, youtube, website

### Bestaande ContentTemplates (320 templates)

**Categorieën:**
- `member` (196): profile_photo, legacy_photo, closeup, intro, in_tenue, lineup, flyer
- `during_match` (73): goal, score_update, end_score, substitution, yellow_card, red_card
- `pre_match` (42): lineup, flyer, walkon, anthem
- `post_match` (6): highlights, match_summary
- `season` (3): season_recap, transformation

---

## 🎯 Seeding Plan

### 1. BrandAssets (per Club)

Elk BrandProfile krijgt standaard assets:

| Asset Type | Beschrijving | Formaat | Per Club |
|------------|--------------|---------|----------|
| `logo_primary` | Hoofdlogo (kleur) | PNG 1024x1024 | 1 |
| `logo_secondary` | Logo wit/zwart variant | PNG 1024x1024 | 1 |
| `logo_icon` | Icon/favicon versie | PNG 512x512 | 1 |
| `wordmark` | Tekst-only logo | SVG | 1 |
| `pattern` | Achtergrond patroon | PNG tileable | 1 |
| `template_bg` | Template achtergrond | PNG 1920x1080 | 1 |

**Totaal BrandAssets:** 3 clubs × 6 assets = **18 BrandAssets**

### 2. MediaItems - Member Content

Per squad member (Participation) maken we media assets voor de belangrijkste templates:

| content_context | moment/subtype | media_type | Beschrijving | Per Speler |
|-----------------|----------------|------------|--------------|------------|
| member | profile_photo | image | Pasfoto officieel | 1 |
| member | in_tenue | image | In teamshirt | 1 |
| member | closeup | image | Close-up gezicht | 1 |
| member | intro | video | Korte introductie clip | 1 |

**Focus:** Alleen actieve squads Season 2024/2025:
- Ajax 1: ~25 spelers × 4 items = 100 MediaItems
- PSV 1: ~25 spelers × 4 items = 100 MediaItems
- Feyenoord 1: ~25 spelers × 4 items = 100 MediaItems

**Subtotaal Member Content:** 300 MediaItems

### 3. MediaItems - Match Content

Per wedstrijd (Activity) in Season 2024/2025 Eredivisie:

| content_context | moment/subtype | media_type | Beschrijving | Per Match |
|-----------------|----------------|------------|--------------|-----------|
| pre-match | lineup | image | Opstellingsgrafiek | 1 |
| pre-match | flyer | image | Match aankondiging | 1 |
| during-match | goal | video | Doelpunt highlight | 2 (avg) |
| during-match | score-update | image | Tussenstand grafiek | 3 (avg) |
| post-match | highlights | video | Samenvatting | 1 |
| post-match | end-score | image | Eindstand grafiek | 1 |

**Wedstrijden beschikbaar:**
- Ajax 1 Eredivisie 2024/2025: ~17 matches
- PSV 1 Eredivisie 2024/2025: ~17 matches
- Feyenoord 1 Eredivisie 2024/2025: ~17 matches

**Berekening per club:** 17 matches × 9 items = 153 MediaItems
**Subtotaal Match Content:** 3 clubs × 153 = 459 MediaItems

### 4. MediaItems - Season Content

Per season maken we team-brede content:

| content_context | moment/subtype | media_type | Beschrijving | Per Season |
|-----------------|----------------|------------|--------------|------------|
| season | team | image | Teamfoto officieel | 1 |
| season | team | image | Teamfoto casual | 1 |
| season | season-recap | video | Seizoensoverzicht | 1 |

**Subtotaal Season Content:** 3 clubs × 1 season × 3 items = 9 MediaItems

---

## 📈 Totaaloverzicht

| Categorie | Items | Status |
|-----------|-------|--------|
| BrandAssets (Ajax, PSV, Feyenoord) | 18 | Nieuw |
| MediaItems - Member | 300 | Nieuw |
| MediaItems - Match | 459 | Nieuw |
| MediaItems - Season | 9 | Nieuw |
| **TOTAAL** | **786** | |

---

## 🔗 Tag Koppelingen

Elk MediaItem krijgt automatisch relevante tags:

### Member Content Tags
```
profile_photo:
  - content_context: member
  - moment: profile-photo
  - subject: player/goalkeeper/coach
  - media_type: image
  - orientation: portrait
  - status: approved

in_tenue:
  - content_context: member
  - moment: in-tenue
  - subject: player/goalkeeper/coach
  - media_type: image
  - orientation: portrait
  - status: approved

intro:
  - content_context: member
  - moment: intro
  - subject: player/goalkeeper/coach
  - media_type: video
  - orientation: portrait (9:16) OR landscape (16:9)
  - status: approved
```

### Match Content Tags
```
lineup:
  - content_context: pre-match
  - moment: lineup
  - subject: team
  - media_type: image
  - orientation: landscape
  - platform: instagram
  - status: published

goal:
  - content_context: during-match
  - moment: goal
  - subject: player
  - media_type: video
  - orientation: landscape
  - status: published

highlights:
  - content_context: post-match
  - moment: highlights
  - subject: team
  - media_type: video
  - orientation: landscape
  - platform: youtube
  - status: published
```

---

## 🖼️ Mock File URLs

Alle MediaItems gebruiken placeholder URLs (echte uploads volgen later):

```
# BrandAssets
https://placeholder.teamreel.io/brands/{club_slug}/logo_primary.png
https://placeholder.teamreel.io/brands/{club_slug}/logo_secondary.png
https://placeholder.teamreel.io/brands/{club_slug}/pattern.png

# Member Photos
https://placeholder.teamreel.io/members/{user_id}/profile_photo.jpg
https://placeholder.teamreel.io/members/{user_id}/in_tenue.jpg
https://placeholder.teamreel.io/members/{user_id}/closeup.jpg
https://placeholder.teamreel.io/members/{user_id}/intro.mp4

# Match Content
https://placeholder.teamreel.io/matches/{activity_id}/lineup.png
https://placeholder.teamreel.io/matches/{activity_id}/flyer.png
https://placeholder.teamreel.io/matches/{activity_id}/goal_{n}.mp4
https://placeholder.teamreel.io/matches/{activity_id}/highlights.mp4
```

---

## ⚡ Implementatie Stappen

### Stap 1: BrandAssets Seeden
```python
# 1. Vind BrandProfiles voor Ajax, PSV, Feyenoord
# 2. Create 6 BrandAssets per profile
# 3. Link naar placeholder URLs
```

### Stap 2: Member MediaItems Seeden
```python
# 1. Query Participations for Season 2024/2025 (Ajax 1, PSV 1, Feyenoord 1)
# 2. Per participation: create 4 MediaItems (profile_photo, in_tenue, closeup, intro)
# 3. Auto-tag based on member role (player/goalkeeper/coach)
# 4. Link to season_id + project_id
```

### Stap 3: Match MediaItems Seeden
```python
# 1. Query Activities (matches) for Eredivisie 2024/2025
# 2. Per match: create lineup, flyer, goals, score-updates, highlights, end-score
# 3. Auto-tag based on content type
# 4. Link to activity_id + period_id (competition) + project_id
```

### Stap 4: Season MediaItems Seeden
```python
# 1. Query Periods (seasons) for 2024/2025
# 2. Per season: create team photo, season recap
# 3. Auto-tag as season content
# 4. Link to period_id + project_id
```

---

## ✅ Validatie Criteria

Na seeding moeten deze queries resultaten geven:

```sql
-- BrandAssets per club
SELECT bp.name, COUNT(ba.id)
FROM branding_brandprofile bp
JOIN branding_brandasset ba ON ba.brand_profile_id = bp.id
WHERE bp.project_id IN (SELECT id FROM projects_project WHERE slug IN ('ajax', 'psv', 'feyenoord'))
GROUP BY bp.name;
-- Expected: 6 assets per club

-- MediaItems per club/season
SELECT p.name as club, per.name as season, COUNT(mi.id)
FROM medialib_mediaitem mi
JOIN projects_project p ON mi.project_id = p.id
JOIN activities_period per ON mi.season_id = per.id
WHERE p.slug IN ('ajax-1', 'psv-1', 'feyenoord-1')
GROUP BY p.name, per.name;
-- Expected: ~170 items per club/season

-- MediaItems by content type
SELECT mt.name as tag, COUNT(mim.mediaitem_id)
FROM medialib_mediatag mt
JOIN medialib_mediaitem_tags mim ON mim.mediatag_id = mt.id
WHERE mt.category = 'content_context'
GROUP BY mt.name;
-- Expected: member (300), pre-match (~100), during-match (~250), post-match (~100), season (9)
```

---

## 🚀 Volgende Stappen

1. **Goedkeuring** - Review dit proposal
2. **Script schrijven** - Management command `seed_media_items`
3. **Dry run** - Eerst met `--dry-run` flag
4. **Uitvoeren** - Op Railway production
5. **Frontend valideren** - MediaLibraryPage moet items tonen
6. **BrandProfileCard update** - Assets weergeven in Identity tab
