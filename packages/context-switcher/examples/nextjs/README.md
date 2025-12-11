# Next.js Example

**Status:** Planned for future implementation

This example will demonstrate a complete Next.js 14+ App Router integration with `@django-core/context-switcher`.

## Planned Features

- ✅ Next.js 14+ App Router setup
- ✅ Organisation and project routing (`/[orgSlug]/[projectSlug]`)
- ✅ Server-side context fetching
- ✅ Client-side context switcher
- ✅ Middleware for context validation
- ✅ Protected routes with redirects
- ✅ Deep path preservation
- ✅ API routes for backend integration

## Quick Start (when implemented)

```bash
cd examples/nextjs
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Implementation Reference

For now, refer to the integration guide for Next.js setup:

**See:** [Integration Guide - Next.js](../../docs/integration-guide.md#nextjs-14-app-router)

## Code Structure (planned)

```
nextjs/
├── app/
│   ├── layout.tsx                    # Root layout with provider
│   ├── page.tsx                      # Landing page
│   ├── [orgSlug]/
│   │   ├── layout.tsx                # Org layout (server component)
│   │   ├── page.tsx                  # Org dashboard
│   │   └── [projectSlug]/
│   │       ├── layout.tsx            # Project layout (server component)
│   │       ├── page.tsx              # Project dashboard
│   │       └── settings/
│   │           └── page.tsx          # Settings page
│   └── api/
│       ├── organisations/
│       │   └── route.ts              # Organisations API
│       └── context/
│           └── route.ts              # Context API
├── components/
│   └── ContextProvider.tsx           # Client-side provider wrapper
├── lib/
│   ├── adapters/
│   │   └── nextRouter.ts             # Next.js router adapter
│   └── api/
│       └── context.ts                # Server-side context fetching
├── middleware.ts                     # Context validation middleware
├── package.json
├── next.config.js
├── tsconfig.json
└── README.md
```

## Key Implementation Snippets

### Root Layout (Client Provider)

```tsx
// app/layout.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ContextSwitcherProvider, ContextSwitcher } from '@django-core/context-switcher';

export default function RootLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const routerAdapter = {
    getCurrentPath: () => pathname,
    navigateTo: (path) => router.push(path),
    buildPathForContext: (context) => {
      if (context.projectSlug) {
        return `/${context.orgSlug}/${context.projectSlug}`;
      }
      return `/${context.orgSlug}`;
    },
  };

  return (
    <html lang="en">
      <body>
        <ContextSwitcherProvider
          config={{
            routerAdapter,
            apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
          }}
        >
          <header>
            <ContextSwitcher variant="horizontal" />
          </header>
          <main>{children}</main>
        </ContextSwitcherProvider>
      </body>
    </html>
  );
}
```

### Server Component with Context

```tsx
// app/[orgSlug]/[projectSlug]/layout.tsx
import { cookies } from 'next/headers';
import { fetchProjectContext } from '@/lib/api/context';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string; projectSlug: string };
}) {
  const context = await fetchProjectContext(params.orgSlug, params.projectSlug);

  return (
    <div>
      <aside>
        <h2>{context.organisation.name}</h2>
        <h3>{context.project.name}</h3>
        <nav>{/* Navigation */}</nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
```

### Server-Side Context Fetching

```tsx
// lib/api/context.ts
import { cookies } from 'next/headers';

export async function fetchProjectContext(orgSlug: string, projectSlug: string) {
  const response = await fetch(
    `${process.env.API_URL}/organisations/${orgSlug}/projects/${projectSlug}`,
    {
      headers: {
        Cookie: cookies().toString(),
      },
      cache: 'no-store', // Always fetch fresh context
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch context');
  }

  return response.json();
}
```

### Middleware for Context Validation

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract org and project from path
  const match = pathname.match(/^\/([^/]+)(?:\/([^/]+))?/);
  if (!match) {
    return NextResponse.next();
  }

  const [, orgSlug, projectSlug] = match;

  // Validate context (check if user has access)
  // In real implementation, would check session/cookies
  // For now, just pass through

  return NextResponse.next();
}

export const config = {
  matcher: ['/:orgSlug/:path*'],
};
```

### API Route

```tsx
// app/api/organisations/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  // In real implementation, fetch from Django backend
  // For demo, return mock data

  const organisations = [
    {
      id: 'org_1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      logo: '/logos/acme.png',
    },
    {
      id: 'org_2',
      name: 'TechStart Inc',
      slug: 'techstart',
      logo: '/logos/techstart.png',
    },
  ];

  return NextResponse.json({ organisations });
}
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
API_URL=http://localhost:8000/api
```

## Contributing

To implement this example:

1. Create the directory structure above
2. Set up Next.js 14+ with TypeScript
3. Install `@django-core/context-switcher`
4. Implement the router adapter
5. Create example pages and layouts (both server and client components)
6. Add API routes
7. Implement middleware for context validation
8. Add comprehensive comments explaining each integration point
9. Update this README with actual running instructions

**Priority:** High - Next.js is a popular framework for Django + React apps

**See Also:**
- [Integration Guide](../../docs/integration-guide.md)
- [Customization Guide](../../docs/customization-guide.md)
- [React Router Example](../react-router/README.md)
