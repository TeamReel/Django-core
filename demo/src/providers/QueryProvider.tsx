/**
 * QueryProvider — TanStack Query v5 provider for the app.
 *
 * Configures sensible defaults for dashboard-style data:
 * - staleTime 5 min: data is "fresh" and won't refetch
 * - gcTime 10 min: unused cache is garbage collected
 * - refetchOnWindowFocus: background refresh when tab regains focus
 * - 1 retry on failure
 *
 * Devtools are only loaded in development mode.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 min — data considered fresh
      gcTime: 10 * 60 * 1000,           // 10 min — garbage collect unused
      refetchOnWindowFocus: true,        // background refresh on tab focus
      retry: 1,                          // 1 retry on failure
      refetchOnMount: 'always',          // always refetch on mount (but show cache)
    },
  },
});

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

export default QueryProvider;
