# T1 — API Response Types

**Status:** 🔲 Todo
**Effort:** 3 uur
**Scope:** ~25 shared interfaces voor alle API endpoints

---

## Doel

Eén `types/api.ts` (of `types/` directory) met typed interfaces voor elke API response. Dit is de basis voor T2–T5 en A1–A3.

## Huidige situatie

- Types verspreid over 640 bestanden, vaak inline `as any`
- `types/` directory heeft alleen `chart.ts`, `season.ts`, `index.ts`
- Hooks definiëren lokaal soms types, maar inconsistent

## Aan te maken interfaces

```typescript
// types/api/
├── activity.ts      // Activity, ActivityParticipation, Match
├── member.ts        // Member, MemberMeta, Membership
├── organisation.ts  // Organisation, OrgMembership
├── project.ts       // Project, ProjectMembership
├── period.ts        // Period, Season, Competition
├── branding.ts      // BrandProfile, BrandAsset, BrandToken
├── content.ts       // ContentTemplate, ContentField, GenerationRequest
├── media.ts         // MediaItem, FileAsset, MediaTag
├── video.ts         // VideoJob, VideoPreset
├── workflow.ts      // Workflow, WorkflowStep
├── credits.ts       // CreditBalance, Transaction
├── common.ts        // PaginatedResponse<T>, ApiEnvelope<T>, ApiError
└── index.ts         // re-exports
```

## Aanpak

1. Audit DRF serializers in `src/` (backend) voor canonical field names
2. Cross-reference met bestaande inline types in hooks
3. Creëer interfaces met JSDoc comments
4. Export via barrel `types/api/index.ts`

## Verificatie

- [ ] Alle 12+ domain types aanwezig
- [ ] `PaginatedResponse<T>` en `ApiEnvelope<T>` generics
- [ ] Bestaande code compileert nog (`npx vite build`)
- [ ] Types worden daadwerkelijk geïmporteerd in T2+
