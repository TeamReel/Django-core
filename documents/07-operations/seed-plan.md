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

### 1. Theme Feature Flag Seed (B10)

**Goal:** One `dark_theme` flag per organisation and club with cascade logic.

**Permission Model:**
| Role | Can Edit | Scope |
|------|----------|-------|
| Superadmin | All | GLOBAL, ORG, PROJECT |
| Land Admin | Own org only | ORGANISATION |
| Club Admin | Own club only | PROJECT |

**Resolution Order (highest wins):**
```
GLOBAL → ORGANISATION → PROJECT
```
If ORG disables dark theme, all clubs under it are disabled regardless of club setting.

**Expected Result:**
- 1 GLOBAL flag (system default: light)
- 5 ORGANISATION flags (1 per federation)
- 97 PROJECT flags (1 per club)
- Total: 103 dark_theme flags

**Command:**
```bash
python manage.py seed_theme_flags
```

---

### 2. Media Tags Seed (B35)

**What are MediaTags?**
Tags for categorizing media items (photos, videos, documents) in the MediaLib.

**Two types:**
1. **System Tags** (is_system=True, project=None)
   - Global tags available to ALL projects
   - Managed by superadmin only
   - Example: "goal", "training", "match-highlight"

2. **Project Tags** (is_system=False, project=FK)
   - Project-specific tags
   - Managed by club/project admins
   - Example: "approved", "featured", "draft"

**System Tags (15):**
| Tag | Description |
|-----|-------------|
| match-highlight | Key match moments |
| goal | Goal clips |
| save | Goalkeeper saves |
| tackle | Defensive plays |
| training | Training footage |
| interview | Player/coach interviews |
| press-conference | Press events |
| fan-content | User-generated content |
| stadium | Venue media |
| team-photo | Team pictures |
| player-portrait | Individual portraits |
| action-shot | In-game action |
| celebration | Goal celebrations |
| lineup | Starting XI graphics |
| tactics-board | Formation visuals |

**Project Tags (12 per project, 4 categories):**
| Category | Tags |
|----------|------|
| media_type | video, photo, document, graphic |
| source | official, broadcast, social-media, user-generated |
| status | raw, edited, approved, published |
| priority | featured, archive, draft |

**Expected Result:**
- 15 system-wide MediaTags
- 12 × 97 = ~1164 project-scoped tags

**Command:**
```bash
python manage.py seed_media_tags
```

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
