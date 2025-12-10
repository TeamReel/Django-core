/**
 * MSW request handlers for API mocking.
 *
 * @packageDocumentation
 */

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
