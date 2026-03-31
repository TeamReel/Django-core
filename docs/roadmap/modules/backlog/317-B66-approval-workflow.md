# 317 — B66 — Approval Workflow

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🔴 critical |
| Effort | ~25 uur |

## Wat

Content goedkeuringsflow zodat gegenereerde video's, flyers en line-ups goedgekeurd moeten worden door bestuur of coaches vóór publicatie. ApprovalRequest model met statussen (pending/approved/rejected/revision), ApprovalRule per project met configureerbare approver-rollen, en optionele auto-approve na tijdslimiet.

## Waarom belangrijk

Amateurclubs publiceren namens de hele club. Een fout in een line-up of een verkeerde score in een graphic is gênant en beschadigt het vertrouwen in de tool. Bestuurders willen controle: "Ik wil even checken voordat dit online gaat." Zonder approval workflow wordt TeamReel een risico in plaats van een hulpmiddel.

## Past in TeamReel / CoreApp

- **TeamReel**: Direct relevant. Clubs hebben bestuurders die content moeten goedkeuren. Coaches hebben controle over line-ups. Dit is een vertrouwensfeature — clubs adopteren TeamReel sneller als ze controle houden.
- **CoreApp**: Approval workflows zijn universeel in content management systemen. Het pattern (request → review → approve/reject) is herbruikbaar voor elk multi-user product met publicatie-flows.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B66-approval-workflow

We bouwen een content approval systeem in de Django 5 + DRF backend.

[feature summary]
Content goedkeuringsflow met ApprovalRequest, ApprovalRule, notificaties, en optionele auto-approve.

[goals]
- ApprovalRequest model: GenericFK naar content, status (pending/approved/rejected/revision_requested)
- ApprovalRule model: per project, per content_type, required_approvers_count, approver roles
- Workflow: content gegenereerd → approval request → notificatie → beslissing → publicatie
- Auto-approve optie: na X uur zonder reactie automatisch goedkeuren
- Permissions: only designated approvers can decide, project admins manage rules
- Audit logging van alle beslissingen

[non-goals]
- Multi-level approval chains (bijv. 3 goedkeuringen vereist)
- Approval delegation (verlof-vervanging)
- Approval SLA tracking

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Content: GenericForeignKey naar diverse content models
- Notifications: B17 (als beschikbaar) of Django signals
- Audit: B09 (als beschikbaar) of eigen logging
- Celery: voor auto-approve timer
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B66-approval-workflow

[tech choices]
- GenericFK: ContentType framework voor polymorphic content referenties
- Status machine: simple enum (pending/approved/rejected/revision_requested)
- Auto-approve: Celery ETA task (scheduled op expires_at)
- Notifications: Django signals → notification handler
- Permissions: custom DRF permission class (IsApprover)

[models]
- ApprovalRequest: content_type, object_id, requested_by, status, decision_note, decided_at, expires_at
- ApprovalRule: project FK, content_type, required_approvers_count, auto_approve_after, approver_roles (JSON)

[api endpoints]
- POST /api/v1/approvals/ — approval aanvragen
- GET /api/v1/approvals/ — pending approvals (voor approver)
- POST /api/v1/approvals/{id}/approve/ — goedkeuren
- POST /api/v1/approvals/{id}/reject/ — afwijzen met reden
- POST /api/v1/approvals/{id}/request-revision/ — revisie vragen
- GET/POST/PATCH /api/v1/approval-rules/ — regels beheren

[files to create]
- src/approvals/ — nieuwe Django app
- tests/test_approvals/
```

### Research

```
/spec-kitty.research feature=B66-approval-workflow

Onderzoek de volgende punten:

1. Welke content types bestaan er die goedkeuring nodig hebben? Check src/ voor generation/content models.
2. Hoe werkt het huidige publicatie-mechanisme? Is er een publish status op content?
3. Welke rollen bestaan er in het systeem? Check permission/role models.
4. Wordt GenericForeignKey al ergens gebruikt in de codebase?
5. Hoe integreert dit met de AI generation pipeline? Wat is het pad van generatie → publicatie?
```
