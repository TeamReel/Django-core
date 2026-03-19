# Seed Command Catalog

Complete catalog of all Django management seed commands available on Railway.

## Core Setup (run in order for fresh DB)

| Order | Command | What it does |
|-------|---------|-------------|
| 1 | `seed_sports` | Sport configuration (football, hockey, etc.) |
| 2 | `seed_demo_data` | 5 orgs, 20 users, 80 projects, events, transactions |
| 3 | `seed_default_roles` | RBAC permissions and roles |
| 4 | `seed_branding` | Brand profiles and design tokens |
| 5 | `seed_app_backgrounds` | Sport-linked video backgrounds (S3 upload) |

## By Domain

### Organisations & Structure
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_demo_data` (accounts) | Full demo: 5 orgs, 20 users, 80 projects | ✅ |
| `seed_demo_data` (organisations) | Basic org demo data | ❌ |
| `seed_admins` | Admin memberships for coaches/directors | ❌ |
| `seed_level_1_users` | 5 demo users | ❌ |
| `seed_level_2_organisations` | 5 European football federations | ❌ |
| `seed_level_3_clubs` | 92 European clubs | ❌ |
| `seed_level_4_teams` | 220 teams | ❌ |
| `seed_level_5_seasons` | 50 seasons | ❌ |
| `seed_level_6_competitions` | 350 competitions | ❌ |
| `seed_level_9_players` | Players and coaching staff | ❌ |
| `seed_teamreel_demo` | Full hierarchical football data | ❌ |
| `seed_teamreel_production` | Complete production demo | ❌ |

### Sports & Configuration
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_sports` | Sport categories and variants | ❌ |
| `seed_teamreel_sports` | Sport assignments + outfits for clubs | ❌ |

### Branding & Visual
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_branding` | Brand profiles and design tokens | ❌ |
| `seed_club_branding` | Club-specific brand profiles | ❌ |
| `seed_app_backgrounds` | Sport-linked video backgrounds (S3) | ✅ |

### Activities & Matches
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_demo_activities` | Periods, Activities, Participations | ❌ |
| `seed_knvb_matches` | KNVB matches (Ajax pattern) | ❌ |
| `seed_match_activity_events` | Match events (goals/assists) | ✅ |
| `seed_match_participations` | Match lineup participations | ❌ |
| `seed_eredivisie_complete` | Full Eredivisie data | ❌ |
| `seed_cup_matches` | KNVB Beker knock-out | ❌ |

### Permissions & RBAC
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_default_roles` | Default permissions and roles | ✅ |
| `seed_teamreel_rbac` | TeamReel hierarchical RBAC | ❌ |
| `seed_rbac_memberships` | Demo RBAC memberships | ❌ |

### Content & Templates
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_content_templates` | Global content templates | ❌ |
| `seed_lineup_433_modern` | 4-3-3 Modern video template | ❌ |
| `seed_templates` | Generation templates per org | ❌ |
| `seed_video_presets` | Video presets and platform exports | ❌ |

### Transactions & Credits
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_credit_transactions` | Credit transactions | ❌ |
| `seed_teamreel_transactions` | Deterministic transactions | ❌ |
| `seed_teamreel_contentgen_demo` | Content-gen usage events | ❌ |

### Settings & Notifications
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_feature_flags` | dark_theme feature flag | ❌ |
| `seed_theme_settings` | Theme settings per org | ❌ |
| `seed_notifications` | Demo notifications | ❌ |
| `seed_teamreel_notifications` | TeamReel notifications (idempotent) | ❌ |

## S3 Requirements

Commands that upload files (e.g. `seed_app_backgrounds`) need these env vars on the `backend` service:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`

These are already configured on the Railway `backend` service.
