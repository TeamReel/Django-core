````markdown
# B66: Approval Workflow

**Priority:** 🔥 Bouwen
**Phase:** 16
**Status:** 📋 ROADMAP
**Module ID:** 317
**Category:** Backend (TeamReel Product Feature)

## Description

## 317. B66 – Approval Workflow

**Doel**: Content goedkeuringsflow zodat gegenereerde video's, flyers en line-ups door bestuur of coaches goedgekeurd moeten worden vóór publicatie.

**Waarom TeamReel**: Amateurclubs hebben vaak een bestuurslid dat content moet goedkeuren voordat het namens de club gepubliceerd wordt. Voorkomt fouten en geeft controle aan de juiste mensen.

**Wat moet er gebeuren**:

### ApprovalRequest Model
- **ApprovalRequest model**:
  - Fields: content_type (GenericFK), object_id, requested_by (User FK), status (pending/approved/rejected/revision_requested)
  - Timestamps: created_at, decided_at, expires_at (optioneel)
  - Metadata: decision_note (text), revision_note (text)
  - Scope: Project niveau

### ApprovalRule Model
- **ApprovalRule model**:
  - Fields: project FK, content_type, required_approvers_count, auto_approve_after (timedelta, optioneel)
  - Approver roles: welke rollen mogen goedkeuren (admin, coach, bestuur)
  - Skip rules: auto-approve voor bepaalde content types of auteurs

### Workflow
1. Content wordt gegenereerd → ApprovalRequest aangemaakt (als regel bestaat)
2. Approvers krijgen notificatie (B17)
3. Approver reviewed en keurt goed / wijst af / vraagt revisie
4. Bij goedkeuring → content wordt publishable
5. Bij afwijzing → auteur krijgt notificatie met reden
6. Optioneel: auto-approve na X uur zonder reactie

### Permissions
- Content creators kunnen approval aanvragen
- Alleen aangewezen approvers kunnen beslissen
- Project admins kunnen rules configureren
- Org admins kunnen alles

### Integration
- B09 (audit logging van beslissingen)
- B17 (notifications naar approvers en creators)
- B64 (realtime status updates)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `POST /api/v1/approvals/` — Approval aanvragen voor content
- `GET /api/v1/approvals/` — Lijst van pending approvals (voor approver)
- `GET /api/v1/approvals/{id}/` — Detail van approval request
- `POST /api/v1/approvals/{id}/approve/` — Goedkeuren
- `POST /api/v1/approvals/{id}/reject/` — Afwijzen met reden
- `POST /api/v1/approvals/{id}/request-revision/` — Revisie aanvragen
- `GET /api/v1/approval-rules/` — Lijst approval rules per project
- `POST /api/v1/approval-rules/` — Rule aanmaken
- `PATCH /api/v1/approval-rules/{id}/` — Rule bewerken

**Status**: 📋 ROADMAP

## Notes
- Nieuw module, toegevoegd op verzoek
- Essentieel voor clubs waar bestuur controle wil over publicaties

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
````
