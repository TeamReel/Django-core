/**
 * MSW request handlers for API mocking.
 *
 * @packageDocumentation
 */

import { rest } from 'msw';

// Use localhost URL for MSW 1.x compatibility with jsdom
const BASE_URL = 'http://localhost';

export const handlers = [
  // GET /api/organisations/
  rest.get(`${BASE_URL}/api/organisations/`, (req, res, ctx) => {
    return res(
      ctx.json({
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
      })
    );
  }),

  // GET /api/organisations/:id/projects/
  rest.get(`${BASE_URL}/api/organisations/:orgId/projects/`, (req, res, ctx) => {
    const { orgId } = req.params;

    if (orgId === 'org_123') {
      return res(
        ctx.json({
          projects: [
            {
              id: 'proj_789',
              name: 'Website Redesign',
              slug: 'website-redesign',
              organisationId: 'org_123',
              metadata: { isArchived: false },
            },
          ],
        })
      );
    }

    return res(ctx.json({ projects: [] }));
  }),

  // GET /api/context/current/
  rest.get(`${BASE_URL}/api/context/current/`, (req, res, ctx) => {
    return res(
      ctx.json({
        organisationId: 'org_123',
        projectId: 'proj_789',
      })
    );
  }),

  // POST /api/context/set/
  rest.post(`${BASE_URL}/api/context/set/`, (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
];
