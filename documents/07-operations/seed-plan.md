# Seed Plan - Database Seeding Strategy

> Last updated: 2026-02-04
> Status: ✅ Branding Seed Complete

## Current Database State (Local)

### Organisations (8 total)
| Name | Type | Notes |
|------|------|-------|
| DFB | Federation | German Football Association |
| FIGC | Federation | Italian Football Federation |
| KNVB | Federation | Royal Dutch Football Association |
| RBFA | Federation | Royal Belgian Football Association |
| The FA | Federation | English Football Association |
| Test_del_* | Test | 3 test orgs (excluded from seeding) |

### Seed Results
| Model | Before | After | Status |
|-------|--------|-------|--------|
| BrandProfile (org) | 3 | 8 | ✅ Complete |
| BrandProfile (club) | 0 | 98 | ⏳ Pending |
| DesignToken | 18 | 48 | ✅ Complete (org only) |
| FeatureFlag | 0 | - | ⏳ Pending |
| MediaTag | 0 | - | ⏳ Pending |

---

## Seed Actions Required

### 1. Branding Seed - Clubs (B33)

**Goal:** 1 BrandProfile per Club (Project with parent_project=null)

**Clubs in Database (98 total by federation):**
| Federation | Clubs | Example |
|------------|-------|---------|
| KNVB | ~20 | Roda, Heino, SVD, etc. |
| FIGC | ~20 | AC Milan, Inter, Juventus, AS Roma, etc. |
| DFB | ~20 | Bayern, Dortmund, etc. |
| RBFA | ~20 | Club Brugge, Anderlecht, etc. |
| The FA | ~20 | Liverpool, Arsenal, Chelsea, etc. |

**Color Generation Strategy:**
- Known clubs: Use official club colors (hardcoded)
- Unknown clubs: Generate colors based on club name hash (deterministic)

**Expected Result:**
- 98 new BrandProfiles (1 per club)
- 588 new DesignTokens (6 per club)

---

### 2. Feature Flags Seed (B10)

**Goal:** Global + Organisation-scoped flags for TeamReel features

**Flags to Create:**
| Key | Default | Description |
|-----|---------|-------------|
| `match_analysis` | ✅ | AI-powered match analysis |
| `video_highlights` | ✅ | Auto video highlight generation |
| `player_stats` | ✅ | Advanced player statistics |
| `formation_editor` | ✅ | Drag-and-drop formations |
| `ai_scouting` | ❌ | AI scouting (beta) |
| `export_pdf` | ✅ | PDF export for reports |
| `live_tracking` | ❌ | GPS tracking (premium) |
| `parent_portal` | ❌ | Parent/guardian access |

**Scope:**
- 8 GLOBAL flags (system-wide defaults)
- 8 × 5 = 40 ORGANISATION flags (per federation)

**Expected Result:**
- 8 global flags
- 40 org-scoped flags
- Total: 48 FeatureFlag records

---

### 3. Media Tags Seed (B35)

**Goal:** System-wide tags + project-scoped tags

**System Tags (15 total):**
```
match-highlight, goal, save, tackle, training, interview,
press-conference, fan-content, stadium, team-photo, player-portrait,
action-shot, celebration, lineup, tactics-board
```

**Project Tags (12 per project, 4 categories):**
- media_type: video, photo, document, graphic
- source: official, broadcast, social-media, user-generated
- status: raw, edited, approved, published
- priority: featured, archive, draft

**Expected Result:**
- 15 system MediaTags
- 12 × N project-scoped tags (N = projects with orgs)

---

## Execution Order

```bash
# 1. First: Branding (most visual impact)
python manage.py seed_branding

# 2. Second: Feature Flags (controls features)
python manage.py seed_feature_flags

# 3. Third: Media Tags (for medialib)
python manage.py seed_media_tags
```

---

## Post-Seed Verification

```bash
python manage.py shell -c "
from branding.models import BrandProfile, DesignToken
from settings.models import FeatureFlag
from medialib.models import MediaTag
print(f'BrandProfiles: {BrandProfile.objects.count()}')
print(f'DesignTokens: {DesignToken.objects.count()}')
print(f'FeatureFlags: {FeatureFlag.objects.count()}')
print(f'MediaTags: {MediaTag.objects.count()}')
"
```

---

## Notes

- All seeds use `update_or_create` for idempotency
- Test orgs (test_del_*) are excluded
- Existing profiles without org link will be cleaned up
