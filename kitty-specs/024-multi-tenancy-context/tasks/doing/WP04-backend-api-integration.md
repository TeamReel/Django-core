---
work_package_id: "WP04"
subtasks:
  - "T037"
  - "T038"
  - "T039"
  - "T040"
  - "T041"
  - "T042"
  - "T043"
  - "T044"
  - "T045"
  - "T046"
  - "T047"
  - "T048"
title: "Backend API Integration"
phase: "Phase 1 - Core Context & UI"
lane: "doing"
assignee: ""
agent: "claude-sonnet-4"
shell_pid: "212"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP04 – Backend API Integration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

Implement API client functions for fetching organisations, projects, and current context from backend B13 endpoints.

**Success Criteria**:
- ✅ API functions fetch data from backend endpoints
- ✅ MSW handlers mock all API responses for testing
- ✅ Error handling covers 401/403/404/500 scenarios
- ✅ B13 error responses normalized to user-friendly messages
- ✅ ContextSwitcherProvider integrated with API calls
- ✅ Unit tests cover all API functions with 90%+ coverage
- ✅ Network errors handled gracefully with retry actions

---

## Context & Constraints

**Why this work package**: Connect frontend context switcher to backend B06/B07 APIs for fetching organisations and projects.

**Architecture Decision** (from research.md): Use shared api-client for CSRF-protected requests, defer all authorization to backend.

**References**:
- Constitution Principle V (Security): Backend is source of truth for authorization
- [contracts/api-contracts.md](../contracts/api-contracts.md) - B13 API specifications
- [research.md](../research.md) - Q3: Backend API Integration decision
- [spec.md](../spec.md) - User Stories 1, 2: Fetch and display organisations

**Constraints**:
- Must use `@django-core/api-client` for all requests
- Must handle B13 JSON envelope format
- Must normalize errors to user-friendly messages
- Must provide retry actions for network failures

---

## Subtasks & Detailed Guidance

### T037 – Create organisationsApi.ts

**Purpose**: Fetch list of organisations user has access to.

**Steps**:
1. Create `src/api/organisationsApi.ts`:
   ```typescript
   import { createApiClient } from '@django-core/api-client';
   import type { Organisation } from '../types';

   export interface OrganisationsResponse {
     organisations: Organisation[];
   }

   export async function fetchOrganisations(
     apiBaseUrl: string = '/api'
   ): Promise<Organisation[]> {
     const client = createApiClient({ baseUrl: apiBaseUrl });
     const response = await client.get<OrganisationsResponse>('/organisations/');

     if (response.error) {
       throw new Error(response.error.message);
     }

     return response.data?.organisations || [];
   }
   ```

**Files**: `src/api/organisationsApi.ts`

**Parallel?**: Yes (alongside T038, T039)

**Notes**: Endpoint from contracts/api-contracts.md: `GET /api/organisations/`

---

### T038 – Create projectsApi.ts

**Purpose**: Fetch list of projects for a given organisation.

**Steps**:
1. Create `src/api/projectsApi.ts`:
   ```typescript
   import { createApiClient } from '@django-core/api-client';
   import type { Project } from '../types';

   export interface ProjectsResponse {
     projects: Project[];
   }

   export async function fetchProjects(
     organisationId: string,
     apiBaseUrl: string = '/api'
   ): Promise<Project[]> {
     const client = createApiClient({ baseUrl: apiBaseUrl });
     const response = await client.get<ProjectsResponse>(
       `/organisations/${organisationId}/projects/`
     );

     if (response.error) {
       throw new Error(response.error.message);
     }

     return response.data?.projects || [];
   }
   ```

**Files**: `src/api/projectsApi.ts`

**Parallel?**: Yes (alongside T037, T039)

**Notes**: Endpoint: `GET /api/organisations/{org_id}/projects/`

---

### T039 – Create contextApi.ts

**Purpose**: Fetch/set current context (optional backend endpoints).

**Steps**:
1. Create `src/api/contextApi.ts`:
   ```typescript
   import { createApiClient } from '@django-core/api-client';

   export interface CurrentContextResponse {
     organisationId?: string;
     projectId?: string;
   }

   export async function fetchCurrentContext(
     apiBaseUrl: string = '/api'
   ): Promise<CurrentContextResponse | null> {
     try {
       const client = createApiClient({ baseUrl: apiBaseUrl });
       const response = await client.get<CurrentContextResponse>('/context/current/');

       if (response.error) {
         // Endpoint may not exist (optional)
         if (response.error.code === 404) {
           return null;
         }
         throw new Error(response.error.message);
       }

       return response.data || null;
     } catch {
       // Graceful fallback if endpoint doesn't exist
       return null;
     }
   }

   export async function setCurrentContext(
     organisationId: string,
     projectId: string | null,
     apiBaseUrl: string = '/api'
   ): Promise<void> {
     try {
       const client = createApiClient({ baseUrl: apiBaseUrl });
       const response = await client.post('/context/set/', {
         organisationId,
         projectId,
       });

       if (response.error) {
         // Endpoint may not exist (optional)
         if (response.error.code === 404) {
           return;
         }
         throw new Error(response.error.message);
       }
     } catch {
       // Graceful fallback if endpoint doesn't exist
     }
   }
   ```

**Files**: `src/api/contextApi.ts`

**Parallel?**: Yes (alongside T037, T038)

**Notes**: These endpoints are optional per contracts/api-contracts.md

---

### T040 – Integrate @django-core/api-client

**Purpose**: Verify shared api-client is properly configured.

**Steps**:
1. Verify `package.json` has dependency (should exist from WP03):
   ```json
   "dependencies": {
     "@django-core/api-client": "workspace:*"
   }
   ```

2. Test import in API files:
   ```typescript
   import { createApiClient } from '@django-core/api-client';
   ```

3. Run `pnpm typecheck` to verify no import errors

**Files**: Verification step

**Parallel?**: No (quick verification after T037-T039)

---

### T041 [P] – Setup MSW handlers

**Purpose**: Mock API responses for deterministic testing.

**Steps**:
1. Create `__tests__/mocks/handlers.ts`:
   ```typescript
   import { http, HttpResponse } from 'msw';

   export const handlers = [
     // GET /api/organisations/
     http.get('/api/organisations/', () => {
       return HttpResponse.json({
         organisations: [
           {
             id: 'org_123',
             name: 'Acme Corp',
             slug: 'acme-corp',
             logo: null,
             metadata: { isPinned: false },
           },
           {
             id: 'org_456',
             name: 'Beta Inc',
             slug: 'beta-inc',
             logo: null,
             metadata: { isPinned: true },
           },
         ],
       });
     }),

     // GET /api/organisations/:id/projects/
     http.get('/api/organisations/:orgId/projects/', ({ params }) => {
       const { orgId } = params;

       if (orgId === 'org_123') {
         return HttpResponse.json({
           projects: [
             {
               id: 'proj_789',
               name: 'Website Redesign',
               slug: 'website-redesign',
               organisationId: 'org_123',
               metadata: { isArchived: false },
             },
           ],
         });
       }

       return HttpResponse.json({ projects: [] });
     }),

     // GET /api/context/current/
     http.get('/api/context/current/', () => {
       return HttpResponse.json({
         organisationId: 'org_123',
         projectId: 'proj_789',
       });
     }),

     // POST /api/context/set/
     http.post('/api/context/set/', () => {
       return HttpResponse.json({ success: true });
     }),
   ];
   ```

2. Update `__tests__/mocks/server.ts`:
   ```typescript
   import { setupServer } from 'msw/node';
   import { handlers } from './handlers';

   export const server = setupServer(...handlers);
   ```

**Files**: `__tests__/mocks/handlers.ts`, `__tests__/mocks/server.ts`

**Parallel?**: Yes (can proceed alongside T042-T044)

---

### T042 [P] – Write unit tests for fetchOrganisations

**Purpose**: Validate organisations API function handles all scenarios.

**Steps**:
1. Create `__tests__/api/organisationsApi.test.ts`:
   ```typescript
   import { fetchOrganisations } from '../../src/api/organisationsApi';
   import { server } from '../mocks/server';
   import { http, HttpResponse } from 'msw';

   describe('fetchOrganisations', () => {
     it('fetches organisations successfully', async () => {
       const orgs = await fetchOrganisations('/api');

       expect(orgs).toHaveLength(2);
       expect(orgs[0].name).toBe('Acme Corp');
       expect(orgs[1].name).toBe('Beta Inc');
     });

     it('handles 401 Unauthorized', async () => {
       server.use(
         http.get('/api/organisations/', () => {
           return HttpResponse.json(
             { error: { code: 401, message: 'Authentication required' } },
             { status: 401 }
           );
         })
       );

       await expect(fetchOrganisations('/api')).rejects.toThrow(
         'Authentication required'
       );
     });

     it('handles 403 Forbidden', async () => {
       server.use(
         http.get('/api/organisations/', () => {
           return HttpResponse.json(
             { error: { code: 403, message: 'Permission denied' } },
             { status: 403 }
           );
         })
       );

       await expect(fetchOrganisations('/api')).rejects.toThrow(
         'Permission denied'
       );
     });

     it('handles 500 Server Error', async () => {
       server.use(
         http.get('/api/organisations/', () => {
           return HttpResponse.json(
             { error: { code: 500, message: 'Server error' } },
             { status: 500 }
           );
         })
       );

       await expect(fetchOrganisations('/api')).rejects.toThrow('Server error');
     });

     it('handles network errors', async () => {
       server.use(
         http.get('/api/organisations/', () => {
           return HttpResponse.error();
         })
       );

       await expect(fetchOrganisations('/api')).rejects.toThrow();
     });
   });
   ```

**Files**: `__tests__/api/organisationsApi.test.ts`

**Parallel?**: Yes (alongside T043, T044)

---

### T043 [P] – Write unit tests for fetchProjects

**Purpose**: Validate projects API function handles all scenarios.

**Steps**:
1. Create `__tests__/api/projectsApi.test.ts`:
   ```typescript
   import { fetchProjects } from '../../src/api/projectsApi';
   import { server } from '../mocks/server';
   import { http, HttpResponse } from 'msw';

   describe('fetchProjects', () => {
     it('fetches projects for organisation', async () => {
       const projects = await fetchProjects('org_123', '/api');

       expect(projects).toHaveLength(1);
       expect(projects[0].name).toBe('Website Redesign');
     });

     it('returns empty array for org with no projects', async () => {
       const projects = await fetchProjects('org_456', '/api');

       expect(projects).toHaveLength(0);
     });

     it('handles 403 Forbidden (no access to org)', async () => {
       server.use(
         http.get('/api/organisations/:orgId/projects/', () => {
           return HttpResponse.json(
             { error: { code: 403, message: 'No access to this organisation' } },
             { status: 403 }
           );
         })
       );

       await expect(fetchProjects('org_999', '/api')).rejects.toThrow(
         'No access to this organisation'
       );
     });

     it('handles 404 Not Found', async () => {
       server.use(
         http.get('/api/organisations/:orgId/projects/', () => {
           return HttpResponse.json(
             { error: { code: 404, message: 'Organisation not found' } },
             { status: 404 }
           );
         })
       );

       await expect(fetchProjects('org_999', '/api')).rejects.toThrow(
         'Organisation not found'
       );
     });

     it('handles network errors', async () => {
       server.use(
         http.get('/api/organisations/:orgId/projects/', () => {
           return HttpResponse.error();
         })
       );

       await expect(fetchProjects('org_123', '/api')).rejects.toThrow();
     });
   });
   ```

**Files**: `__tests__/api/projectsApi.test.ts`

**Parallel?**: Yes (alongside T042, T044)

---

### T044 [P] – Write unit tests for contextApi

**Purpose**: Validate context API functions handle optional endpoints gracefully.

**Steps**:
1. Create `__tests__/api/contextApi.test.ts`:
   ```typescript
   import { fetchCurrentContext, setCurrentContext } from '../../src/api/contextApi';
   import { server } from '../mocks/server';
   import { http, HttpResponse } from 'msw';

   describe('fetchCurrentContext', () => {
     it('fetches current context', async () => {
       const context = await fetchCurrentContext('/api');

       expect(context).toEqual({
         organisationId: 'org_123',
         projectId: 'proj_789',
       });
     });

     it('returns null if endpoint does not exist', async () => {
       server.use(
         http.get('/api/context/current/', () => {
           return HttpResponse.json(
             { error: { code: 404, message: 'Not found' } },
             { status: 404 }
           );
         })
       );

       const context = await fetchCurrentContext('/api');
       expect(context).toBeNull();
     });
   });

   describe('setCurrentContext', () => {
     it('sets current context', async () => {
       await expect(
         setCurrentContext('org_123', 'proj_789', '/api')
       ).resolves.not.toThrow();
     });

     it('handles endpoint not existing gracefully', async () => {
       server.use(
         http.post('/api/context/set/', () => {
           return HttpResponse.json(
             { error: { code: 404, message: 'Not found' } },
             { status: 404 }
           );
         })
       );

       await expect(
         setCurrentContext('org_123', 'proj_789', '/api')
       ).resolves.not.toThrow();
     });
   });
   ```

**Files**: `__tests__/api/contextApi.test.ts`

**Parallel?**: Yes (alongside T042, T043)

---

### T045 – Update ContextSwitcherProvider to call fetchOrganisations

**Purpose**: Load organisations list on provider mount.

**Steps**:
1. Open `src/context/ContextSwitcherProvider.tsx`

2. Add import:
   ```typescript
   import { fetchOrganisations } from '../api/organisationsApi';
   ```

3. Update initialization effect:
   ```typescript
   useEffect(() => {
     const initializeContext = async () => {
       try {
         setContext((prev) => ({ ...prev, isLoading: true }));

         // Fetch organisations
         const orgs = await fetchOrganisations(apiBaseUrl);
         setOrganisations(orgs);

         // Parse context from URL
         const currentPath = routerAdapter.getCurrentPath();
         // TODO: Parse org/project slugs from path, match to fetched data

         setContext((prev) => ({ ...prev, isLoading: false }));
       } catch (error) {
         setContext({
           organisation: null,
           project: null,
           isLoading: false,
           error: {
             code: 0,
             message: error instanceof Error ? error.message : 'Failed to load organisations',
             details: error,
           },
         });
       }
     };

     initializeContext();
   }, [routerAdapter, apiBaseUrl]);
   ```

**Files**: `src/context/ContextSwitcherProvider.tsx`

**Parallel?**: No (integration step)

---

### T046 – Update ContextSwitcherProvider to call fetchProjects

**Purpose**: Load projects list when organisation context changes.

**Steps**:
1. Open `src/context/ContextSwitcherProvider.tsx`

2. Add import:
   ```typescript
   import { fetchProjects } from '../api/projectsApi';
   ```

3. Add effect to fetch projects when org changes:
   ```typescript
   useEffect(() => {
     const loadProjects = async () => {
       if (!context.organisation) {
         setProjects([]);
         return;
       }

       try {
         const projectList = await fetchProjects(context.organisation.id, apiBaseUrl);
         setProjects(projectList);
       } catch (error) {
         console.error('Failed to load projects:', error);
         setProjects([]);
       }
     };

     loadProjects();
   }, [context.organisation, apiBaseUrl]);
   ```

**Files**: `src/context/ContextSwitcherProvider.tsx`

**Parallel?**: No (follows T045)

---

### T047 – Update ContextSwitcherProvider to call fetchCurrentContext

**Purpose**: Load user's current context from backend if endpoint exists.

**Steps**:
1. Open `src/context/ContextSwitcherProvider.tsx`

2. Add import:
   ```typescript
   import { fetchCurrentContext } from '../api/contextApi';
   ```

3. Update initialization effect to try fetching current context:
   ```typescript
   // Inside initializeContext function, after fetching organisations:
   const currentContextFromBackend = await fetchCurrentContext(apiBaseUrl);

   if (currentContextFromBackend?.organisationId) {
     const org = orgs.find((o) => o.id === currentContextFromBackend.organisationId);
     if (org) {
       // Fetch projects for this org
       const projectList = await fetchProjects(org.id, apiBaseUrl);
       setProjects(projectList);

       const project = currentContextFromBackend.projectId
         ? projectList.find((p) => p.id === currentContextFromBackend.projectId)
         : null;

       setContext({
         organisation: org,
         project: project || null,
         isLoading: false,
         error: null,
       });
       return;
     }
   }

   // Fallback: Parse from URL if backend didn't provide context
   ```

**Files**: `src/context/ContextSwitcherProvider.tsx`

**Parallel?**: No (integration with T045, T046)

---

### T048 – Update useContextSwitcher to call setCurrentContext

**Purpose**: Persist context changes to backend if endpoint exists.

**Steps**:
1. Open `src/context/ContextSwitcherProvider.tsx`

2. Add import:
   ```typescript
   import { setCurrentContext } from '../api/contextApi';
   ```

3. Update `switchContext` function to call backend:
   ```typescript
   // Inside switchContext, after successful navigation:

   // Persist to backend (fire-and-forget, optional endpoint)
   setCurrentContext(org.id, project?.id || null, apiBaseUrl).catch((error) => {
     console.warn('Failed to persist context to backend:', error);
   });
   ```

**Files**: `src/context/ContextSwitcherProvider.tsx`

**Parallel?**: No (final integration)

---

## Risks & Mitigations

**Risk**: Backend API changes break frontend
**Mitigation**: Freeze API contract with backend team, use MSW for tests (insulates from backend changes)

**Risk**: Network failures break app
**Mitigation**: All API functions throw errors, provider catches and shows error state with retry

**Risk**: CORS issues in local dev
**Mitigation**: Document Django CORS settings in quickstart.md

**Risk**: Rate limiting not handled
**Mitigation**: Defer to future, add exponential backoff if needed

---

## Definition of Done Checklist

- [ ] organisationsApi.ts implemented
- [ ] projectsApi.ts implemented
- [ ] contextApi.ts implemented (optional endpoints)
- [ ] Shared api-client integrated
- [ ] MSW handlers created for all endpoints
- [ ] Unit tests for fetchOrganisations (all error scenarios)
- [ ] Unit tests for fetchProjects (all error scenarios)
- [ ] Unit tests for contextApi (optional endpoint handling)
- [ ] ContextSwitcherProvider fetches organisations on mount
- [ ] ContextSwitcherProvider fetches projects when org changes
- [ ] ContextSwitcherProvider loads current context from backend
- [ ] useContextSwitcher persists context changes to backend
- [ ] All tests pass
- [ ] Test coverage 90%+

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. All API functions use shared api-client
2. MSW handlers mock all B13 endpoints
3. Error scenarios covered in tests (401/403/404/500)
4. Provider integrates API calls correctly
5. Optional endpoints (context) handled gracefully

**What to verify**:
- Run `pnpm test` - all tests pass
- Check MSW handlers - realistic B13 responses
- Review error handling - user-friendly messages
- Test with real backend - CSRF tokens work

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-10T18:32:51Z – claude-sonnet-4 – shell_pid=212 – lane=doing – Started WP04 - Backend API Integration
