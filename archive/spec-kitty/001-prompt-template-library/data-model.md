# Data Model: Prompt Template Library (D13)

## Model Changes

### GenerationTemplate (existing — extended)

**File**: `src/generative/models.py`
**Table**: `generative_template`

#### Existing Fields (no changes)
| Field | Type | Notes |
|-------|------|-------|
| id | UUIDField (PK) | Auto-generated |
| organisation | FK → Organisation | **Currently NOT nullable** — migration adds `null=True, blank=True` to support global templates |
| name | CharField(255) | Human-readable name |
| slug | SlugField(255) | URL-safe identifier |
| version | CharField(20) | Semver, default "1.0.0" |
| parent_template | FK → self | For version chains |
| is_latest | BooleanField | Default True |
| description | TextField | Template description |
| template_type | CharField | Choices: member, season, pre/during/post_match, custom |
| template_subtype | CharField | ~20 subtypes |
| input_schema | JSONField | JSON Schema Draft 7 |
| pipeline_config | JSONField | Provider + pipeline settings |
| retention_days | IntegerField | Default 90 |
| is_active | BooleanField | Soft-delete flag |
| created_at | DateTimeField | Auto |
| updated_at | DateTimeField | Auto |
| created_by | FK → User | Nullable |

#### New Fields (this feature)
| Field | Type | Notes |
|-------|------|-------|
| prompt_text | TextField | Prompt with `{placeholder}` variables. Blank=True, default="" |
| parameters_schema | JSONField | Parameter definitions: `{key: {label, type, options, default}}`. Default=dict |
| preprocessing_config | JSONField | Preprocessing pipeline per input: `{input_key: "processor_name"}`. Default=dict |

#### Migration: Organisation FK (Done — WP01)
The `organisation` FK is now **nullable** (`null=True, blank=True`) — changed in migration `0009` (WP01, commit `d5b1e9550`). Global seed templates use `organisation=None`. Existing rows keep their FK unchanged.

#### Constraints
- `unique_together = [("organisation", "slug", "version")]`
- 3 existing indexes preserved

## Seed Data (10 templates)

| Slug | Name | Category | Prompt Length |
|------|------|----------|--------------|
| logo_standardize | Logo Standaardiseren | logo | ~200 chars |
| sponsor_standardize | Sponsor Standaardiseren | sponsor | ~200 chars |
| tenue_generate | Tenue Genereren | tenue | ~300 chars |
| keeper_tenue | Keeper Tenue | tenue | ~300 chars |
| tracksuit_generate | Trainingspak Genereren | clothing | ~250 chars |
| coach_outfit | Coach Outfit | clothing | ~250 chars |
| fullbody_in_tenue | Fullbody in Tenue | member | ~400 chars |
| closeup_in_tenue | Closeup in Tenue | member | ~350 chars |
| member_intro | Member Intro | member | ~300 chars |
| member_goal_celebration | Doelpunt Viering | member | ~350 chars |

## Cache Strategy

- **Key format**: `prompt_template:{org_id}:{slug}`
- **TTL**: 300 seconds
- **Invalidation**: `post_save` signal on GenerationTemplate
- **Fallback**: org-specific → global (org=None) → 404