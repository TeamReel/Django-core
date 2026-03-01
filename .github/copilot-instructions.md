# TeamReel — AI-Powered Content Platform for Sports Clubs

## What is TeamReel?
A web application (desktop + mobile) that lets amateur sports clubs generate professional branded content (videos, visuals, line-ups, match graphics) in their own club style — automatically, using AI.

**Core value:** Any team member can create match-day content in minutes, without design skills.

## Tech Stack
| Layer | Tech | Location |
|-------|------|----------|
| **Backend** | Django 5 + DRF | `src/` (Django apps) |
| **Frontend** | React 18 + TypeScript + Vite | `demo/src/` |
| **Database** | PostgreSQL | Railway (production) |
| **Storage** | Amazon S3 | FileAsset model |
| **Video** | FFmpeg pipeline | `src/video/` |
| **AI** | OpenAI, Gemini, LangGraph | `src/generative/` |
| **Deploy** | Railway (backend), Vercel (frontend) | |

## Data Hierarchy
```
Organisation (club/federation)
 └─ Project (club or team — nested via parent_project)
     └─ BrandProfile (colors, logo, kits, tokens — inherits from parent)
     └─ Period (season → competition — nested via parent_period)
         └─ Activity (match, training, event)
             └─ ActivityParticipation (members in activity + roles)
     └─ Members (players, coaches, staff — with sport-specific metadata)
```

## Content Generation Pipeline
| App | Role |
|-----|------|
| `branding/` | BrandProfile + BrandAsset — club identity (logos, kits, colors, tokens) |
| `content_generation/` | ContentTemplate + ContentField — defines what content types exist (pre-match, post-match, etc.) |
| `generative/` | GenerationRequest + GenerationResult — AI pipeline (prompt → provider → output) |
| `video/` | VideoJob + VideoPreset + VideoOverlay — FFmpeg transcoding, composition, platform exports |
| `medialib/` | MediaItem + MediaTag — rich media library with search, tags, processing state |
| `files/` | FileAsset — low-level S3 storage (org-scoped, mime type, soft-delete) |

## Media Architecture (4 layers)
1. **Storage** — `FileAsset`: S3 path, size, mime type (knows nothing about business logic)
2. **Rich Media** — `MediaItem`: processing state, search, tags, dimensions (project-scoped)
3. **Linking** — `BrandAsset` / `MediaItemRelation`: semantic link to any business object (GenericFK)
4. **Video Processing** — `VideoJob`: FFmpeg transcode, thumbnails, composition, platform exports

## Key Backend Apps
| App | Purpose |
|-----|---------|
| `organisations/` | Multi-tenancy: Organisation + Membership |
| `projects/` | Club/Team hierarchy (nested Project via `parent_project`) |
| `activities/` | Period (seasons/competitions) + Activity (matches/events) + Participation |
| `sport_configuration/` | Sport → SportVariant → Position definitions |
| `branding/` | Brand identity + asset management |
| `workflows/` | State machine for approval flows |
| `search/` | Hierarchical search + related results |
| `navigation/` | Recents & Favorites (user navigation state) |
| `credits/` | Credit system for AI generation |
| `accounts/` | User auth (JWT) + profiles |

## Frontend Structure (`demo/src/`)
| Folder | Purpose |
|--------|---------|
| `pages/` | Route-level pages (dashboard, projects, activities, identity, studio, etc.) |
| `components/` | Shared UI: AppShell, Sidebar, MobileBottomNav, SearchBar, modals, wizards |
| `providers/` | React context: Auth, Season, Theme, Organisation |
| `adapters/` | API client layer (fetch wrappers with guardrails) |
| `hooks/` | Shared hooks (useApi, useDebounce, etc.) |
| `layouts/` | Page layout shells |
| `styles/` | Global CSS + design tokens |

**Mobile-first:** Components like `MobileBottomNav`, `MobileFilterSheet`, `SwipeableCard`, `QuickCreateFAB` ensure responsive mobile UX alongside desktop.

## Code Conventions
- **Python:** PEP8, type hints, clean imports. Django models use UUIDField PKs.
- **TypeScript:** Strict mode, interfaces for API responses, no `any`.
- **Database:** **NEVER DROP TABLES.** Use safe migrations (`update_or_create`). PostgreSQL features (SearchVector, JSONField, CTEs).
- **API:** REST (DRF ViewSets), consistent pagination, org-scoped querysets.
- **Git:** Conventional commits, push to `main`.

## Decision Protocol
When choosing between approaches: present 2-3 options with trade-offs, recommend the one that best fits the 80/20 principle (core value first, avoid premature optimization).

## Sources of Truth
1. `documents/` — Active documentation + roadmap
2. **Codebase** — The implementation
3. **Railway/Production** — Real-world data state
