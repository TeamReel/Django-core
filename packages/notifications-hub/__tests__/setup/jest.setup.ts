import '@testing-library/jest-dom';
import 'whatwg-fetch'; // Polyfill fetch for MSW in Node.js environment
// MSW server setup commented out for now - will be configured in WP04 when API integration tests are added
// import { server } from './msw-server';

// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
