import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Server for Node.js Test Environment (MSW v2)
 *
 * This server intercepts all HTTP requests during tests and responds
 * with mocked data. No real backend API calls are made.
 */
export const server = setupServer(...handlers);
