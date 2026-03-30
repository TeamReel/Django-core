# A2 — Domain API Modules

**Status:** 🔲 Todo
**Effort:** 4 uur
**Scope:** ~10 domain modules
**Vereist:** A1 + T1

---

## Doel

Typed domain-specifieke API modules die de core client wrappen. Elke module kent de endpoints, parameters, en return types van één domain.

## Structuur

```
src/api/
├── client.ts          // (uit A1)
├── activities.ts      // getActivity, listMatches, createMatch, updateMatch, deleteMatch
├── members.ts         // getMember, listMembers, addMember, updateMember, removeMember
├── organisations.ts   // getOrg, listOrgs, updateOrg, getOrgMemberships
├── projects.ts        // getProject, listProjects, createProject, updateProject
├── periods.ts         // getSeason, listSeasons, getCompetition, listCompetitions
├── branding.ts        // getBrandProfile, updateBrandProfile, listBrandAssets
├── content.ts         // listTemplates, generateContent, getGenerationResult
├── media.ts           // listMediaItems, uploadMedia, deleteMedia
├── video.ts           // createVideoJob, getVideoJob, listVideoJobs
├── credits.ts         // getBalance, listTransactions, createTransaction
├── workflows.ts       // getWorkflow, updateWorkflowStep, listWorkflows
└── index.ts           // barrel export
```

## Voorbeeld

```typescript
// api/activities.ts
import { api } from './client';
import type { Activity, Match, PaginatedResponse } from '../types/api';

export const activitiesApi = {
  list: (projectId: string, params?: { periodId?: string; type?: string }) =>
    api.list<Activity>(`/activities/`, { project_id: projectId, ...params }),

  get: (id: string) =>
    api.get<Activity>(`/activities/${id}/`),

  createMatch: (data: Partial<Match>) =>
    api.post<Match>(`/activities/`, { ...data, activity_type: 'match' }),

  updateMatch: (id: string, data: Partial<Match>) =>
    api.patch<Match>(`/activities/${id}/`, data),

  deleteMatch: (id: string) =>
    api.delete(`/activities/${id}/`),
};
```

## Verificatie

- [ ] Alle 10+ domain modules aanwezig
- [ ] Volledige CRUD coverage per domain
- [ ] Types correct (geen `any`)
- [ ] Barrel export in `api/index.ts`
