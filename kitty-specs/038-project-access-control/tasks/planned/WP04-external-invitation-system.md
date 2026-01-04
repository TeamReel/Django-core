---
work_package_id: WP04
title: External Invitation System (US2)
lane: planned
subtasks: [T019, T020, T021, T022, T023, T024, T025, T026]
priority: P1
estimated_effort: 3-4 days
dependencies: [WP01, WP02, WP03]
---

# WP04: External Invitation System (US2)

## Objective
Project admins can invite external users via email with token-based acceptance.

## Key Deliverables
- ProjectInviteSerializer (T019)
- ProjectInviteViewSet with invitation endpoints (T020)
- InvitationService with token generation (T021)
- Email template (T022)
- B16 Celery task for email dispatch (T023)
- Frontend: InviteMemberModal external tab (T024)
- Frontend: AcceptInvitation page (T025)
- Frontend: PendingInvites tab (T026)

## API Endpoints
```
GET    /api/v1/projects/{id}/invitations
POST   /api/v1/projects/{id}/invitations
GET    /api/v1/invitations/{token} (public)
POST   /api/v1/invitations/{token} (accept)
DELETE /api/v1/projects/{id}/invitations/{invite_id}
```

## Token Security
- Generate: secrets.token_urlsafe(32) → 43 chars
- Expiry: 7 days (configurable)
- Single-use: Status updated to 'accepted' after use
- Rate limit: 20 invites/hour per user

## Email Template
**Subject**: You've been invited to {project_name}
**Body**: Magic link {frontend_url}/accept-invitation/{token}
**Expiry warning**: Expires in 7 days

## Success Criteria
- Invite sent, email received (check Mailhog)
- Accept flow works for logged-in and new users
- Email mismatch warning shown
- Expired invites rejected
- Pending invites visible in admin UI
