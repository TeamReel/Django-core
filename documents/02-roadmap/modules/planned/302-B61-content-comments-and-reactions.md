# B61: Content Comments & Reactions

**Phase:** 15
**Status:** 📋 ROADMAP
**Module ID:** 302
**Category:** Backend (TeamReel Product Feature)

## Description

## 302. B61 – Content Comments & Reactions

**Doel**: Commentaar en emoji-reacties op gegenereerde content items, zodat teamleden feedback kunnen geven op video's, flyers en line-ups vóór publicatie.

**Waarom TeamReel**: Core engagement feature — coaches en bestuur moeten feedback kunnen geven op gegenereerde content voordat het gepubliceerd wordt. Vergroot betrokkenheid en kwaliteit van output. Bouwt voort op het agnostische B42 (Comments & Discussions) framework maar is specifiek gericht op het content-generatie domein.

**Wat moet er gebeuren**:
- **Comment model** (via B42 GenericFK of standalone):
  - Fields: author (User FK), content_type, object_id, body (text), parent (self-FK voor threading)
  - Timestamps: created_at, updated_at
  - Soft delete: deleted_at
  - Scope: Organisation/Project niveau
- **Reaction model**:
  - Fields: author (User FK), content_type, object_id, emoji
  - Vaste emoji set: 🔥 ❤️ 👍 😂 💪 🎯
  - Unique constraint: (author, content_type, object_id, emoji) — 1 reactie per type per user
  - Reaction counts: geaggregeerd per object
- **Content-specifieke integraties**:
  - Koppeling aan GenerativeRequest / ContentItem
  - Koppeling aan MediaAsset (foto's, video's)
  - Koppeling aan LineupConfiguration
- **Threading**:
  - Max depth: 2 niveaus (comment → reply, geen reply-op-reply)
  - Flat view mode als fallback
- **Notification triggers**:
  - Nieuwe comment op jouw content → push/in-app notificatie
  - @mention in comment body → notificatie naar genoemde user
  - Nieuwe reactie op jouw content → gegroepeerd ("3 personen reageerden op je line-up")
- **Permissions**:
  - Iedereen in het project kan comments plaatsen
  - Alleen eigen comments bewerken/verwijderen
  - Project admins kunnen alle comments modereren
  - Org admins kunnen alles
- **Integration**: B42 (base comments), B09 (audit), B17 (notifications), B08 (permissions)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/comments/?content_type=generativerequest&object_id={id}` — Comments voor een content item
- `POST /api/v1/comments/` — Nieuwe comment (body, parent optioneel)
- `PATCH /api/v1/comments/{id}/` — Comment bewerken
- `DELETE /api/v1/comments/{id}/` — Soft delete
- `POST /api/v1/reactions/` — Reactie toevoegen (content_type, object_id, emoji)
- `DELETE /api/v1/reactions/{id}/` — Reactie verwijderen
- `GET /api/v1/reactions/counts/?content_type=X&object_id=Y` — Reaction counts per emoji

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B61-content-comments-and-reactions

[feature summary]
Comments and emoji reactions on generated content items (videos, flyers, lineups) for team feedback before publishing.

[goals]
- Comment model with GenericFK for polymorphic attachment to content items
- Threading support (max depth 2)
- Emoji reaction model with fixed set (🔥 ❤️ 👍 😂 💪 🎯)
- Unique constraint per user per emoji per object
- Notification triggers: new comment, @mention, reaction grouping
- Project-level permissions with admin moderation

[non-goals]
- Rich text editor (plain text/markdown only)
- File attachments in comments
- Real-time updates (handled by B63)
- Cross-project comment visibility

[dependencies]
- B42 (agnostic comments framework — optional base)
- B09 (audit logging)
- B17 (notifications for mentions/replies)
- B08 (permissions)

[scope]
Backend only — Django app, REST API, pytest tests, README
Frontend integration via Roadmap #30 H4
```
