/**
 * MSW server setup for Node.js test environment (MSW v1.x).
 *
 * @packageDocumentation
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
