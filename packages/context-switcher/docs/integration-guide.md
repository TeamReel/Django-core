# Integration Guide

This guide provides detailed integration instructions for `@django-core/context-switcher` with various frontend frameworks and backend systems.

## Table of Contents

- [React Router v6](#react-router-v6)
- [Next.js 14+ (App Router)](#nextjs-14-app-router)
- [Next.js (Pages Router)](#nextjs-pages-router)
- [Django Templates](#django-templates)
- [Backend Integration](#backend-integration)
- [Advanced Configuration](#advanced-configuration)

---

## React Router v6

### Installation

```bash
pnpm add react-router-dom @django-core/context-switcher
```

### Basic Setup

```tsx
// src/App.tsx
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import {
  ContextSwitcherProvider,
  ContextSwitcher,
} from '@django-core/context-switcher';
import type { RouterAdapter } from '@django-core/context-switcher';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const routerAdapter: RouterAdapter = {
    getCurrentPath: () => location.pathname,
    navigateTo: (path) => navigate(path),
    buildPathForContext: (context) => {
      if (context.projectSlug) {
        return `/${context.orgSlug}/${context.projectSlug}`;
      }
      return `/${context.orgSlug}`;
    },
  };

  return (
    <ContextSwitcherProvider
      config={{
        routerAdapter,
        apiBaseUrl: '/api',
      }}
    >
      <div className="app">
        <header>
          <Logo />
          <ContextSwitcher variant="horizontal" />
          <UserMenu />
        </header>
        <main>
          <Routes>
            <Route path="/:orgSlug" element={<OrgDashboard />} />
            <Route path="/:orgSlug/:projectSlug" element={<ProjectDashboard />} />
            <Route path="/:orgSlug/:projectSlug/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </ContextSwitcherProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
```

### Advanced: Preserving Deep Paths

To preserve the current page path when switching contexts:

```tsx
const routerAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (context, options) => {
    const basePath = context.projectSlug
      ? `/${context.orgSlug}/${context.projectSlug}`
      : `/${context.orgSlug}`;

    // Extract sub-path after org/project segments
    const segments = location.pathname.split('/');
    const subPath = segments.slice(3).join('/'); // e.g., "settings/members"

    if (subPath && !options?.replace) {
      return `${basePath}/${subPath}`;
    }

    return basePath;
  },
};
```

### Protecting Routes

Use the context hook to protect routes that require an organisation or project:

```tsx
import { useContextSwitcher } from '@django-core/context-switcher';
import { Navigate, useParams } from 'react-router-dom';

function ProjectRoute({ children }: { children: React.ReactNode }) {
  const { context } = useContextSwitcher();
  const { orgSlug, projectSlug } = useParams();

  if (context.isLoading) {
    return <LoadingSpinner />;
  }

  if (!context.project || context.project.slug !== projectSlug) {
    return <Navigate to={`/${orgSlug}`} />;
  }

  return <>{children}</>;
}

// Usage
<Route
  path="/:orgSlug/:projectSlug/settings"
  element={
    <ProjectRoute>
      <Settings />
    </ProjectRoute>
  }
/>
```

---

## Next.js 14+ (App Router)

### Installation

```bash
pnpm add next @django-core/context-switcher
```

### Layout Setup

```tsx
// app/layout.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  ContextSwitcherProvider,
  ContextSwitcher,
} from '@django-core/context-switcher';
import type { RouterAdapter } from '@django-core/context-switcher';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const routerAdapter: RouterAdapter = {
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

### Dynamic Routes

```tsx
// app/[orgSlug]/[projectSlug]/page.tsx
'use client';

import { useContextSwitcher } from '@django-core/context-switcher';
import { useParams } from 'next/navigation';

export default function ProjectPage() {
  const { context } = useContextSwitcher();
  const params = useParams();

  if (context.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1>{context.project?.name}</h1>
      <p>Slug: {params.projectSlug}</p>
    </div>
  );
}
```

### Server Components

For server components, fetch context from the backend:

```tsx
// app/[orgSlug]/[projectSlug]/layout.tsx
import { cookies } from 'next/headers';

async function getContext(orgSlug: string, projectSlug: string) {
  const response = await fetch(
    `${process.env.API_URL}/organisations/${orgSlug}/projects/${projectSlug}`,
    {
      headers: {
        Cookie: cookies().toString(),
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch context');
  }

  return response.json();
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgSlug: string; projectSlug: string };
}) {
  const context = await getContext(params.orgSlug, params.projectSlug);

  return (
    <div>
      <aside>
        <h2>{context.organisation.name}</h2>
        <h3>{context.project.name}</h3>
      </aside>
      <main>{children}</main>
    </div>
  );
}
```

---

## Next.js (Pages Router)

### Installation

```bash
pnpm add next @django-core/context-switcher
```

### _app.tsx Setup

```tsx
// pages/_app.tsx
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import {
  ContextSwitcherProvider,
  ContextSwitcher,
} from '@django-core/context-switcher';
import type { RouterAdapter } from '@django-core/context-switcher';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  const routerAdapter: RouterAdapter = {
    getCurrentPath: () => router.pathname,
    navigateTo: (path) => router.push(path),
    buildPathForContext: (context) => {
      if (context.projectSlug) {
        return `/[orgSlug]/[projectSlug]`;
      }
      return `/[orgSlug]`;
    },
  };

  return (
    <ContextSwitcherProvider
      config={{
        routerAdapter,
        apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
      }}
    >
      <header>
        <ContextSwitcher variant="horizontal" />
      </header>
      <Component {...pageProps} />
    </ContextSwitcherProvider>
  );
}
```

### Dynamic Pages

```tsx
// pages/[orgSlug]/[projectSlug]/index.tsx
import { useContextSwitcher } from '@django-core/context-switcher';
import { useRouter } from 'next/router';

export default function ProjectPage() {
  const { context } = useContextSwitcher();
  const router = useRouter();
  const { orgSlug, projectSlug } = router.query;

  if (context.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1>{context.project?.name}</h1>
      <p>Organisation: {context.organisation?.name}</p>
    </div>
  );
}
```

---

## Django Templates

For server-rendered Django templates with minimal JavaScript, use a simplified adapter:

### Installation

```bash
pnpm add @django-core/context-switcher
```

### Vite/Build Setup

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'static/dist',
    rollupOptions: {
      input: 'src/context-switcher.tsx',
      output: {
        entryFileNames: 'context-switcher.js',
        assetFileNames: 'context-switcher.css',
      },
    },
  },
});
```

### React Component

```tsx
// src/context-switcher.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ContextSwitcherProvider,
  ContextSwitcher,
} from '@django-core/context-switcher';
import type { RouterAdapter } from '@django-core/context-switcher';

const routerAdapter: RouterAdapter = {
  getCurrentPath: () => window.location.pathname,
  navigateTo: (path) => {
    window.location.href = path;
  },
  buildPathForContext: (context) => {
    if (context.projectSlug) {
      return `/orgs/${context.orgSlug}/projects/${context.projectSlug}/`;
    }
    return `/orgs/${context.orgSlug}/`;
  },
};

function ContextSwitcherApp() {
  return (
    <ContextSwitcherProvider
      config={{
        routerAdapter,
        apiBaseUrl: '/api',
      }}
    >
      <ContextSwitcher variant="horizontal" />
    </ContextSwitcherProvider>
  );
}

// Mount component
const container = document.getElementById('context-switcher-root');
if (container) {
  const root = createRoot(container);
  root.render(<ContextSwitcherApp />);
}
```

### Django Template

```django
{% load static %}
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
  <link rel="stylesheet" href="{% static 'dist/context-switcher.css' %}">
</head>
<body>
  <header>
    <a href="/">Logo</a>
    <div id="context-switcher-root"></div>
    <nav><!-- Navigation --></nav>
  </header>

  <main>
    {% block content %}{% endblock %}
  </main>

  <script type="module" src="{% static 'dist/context-switcher.js' %}"></script>
</body>
</html>
```

---

## Backend Integration

### Django REST Framework

#### Views

```python
# views.py
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Organisation, Project
from .serializers import OrganisationSerializer, ProjectSerializer


class OrganisationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrganisationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return organisations the user has access to."""
        return Organisation.objects.filter(
            members__user=self.request.user
        ).distinct()

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """List projects within an organisation."""
        organisation = self.get_object()
        projects = Project.objects.filter(
            organisation=organisation,
            members__user=request.user
        ).distinct()

        serializer = ProjectSerializer(projects, many=True)
        return Response({'projects': serializer.data})


class ContextViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request):
        """Get current context from session."""
        org_id = request.session.get('context_organisation_id')
        project_id = request.session.get('context_project_id')

        data = {}

        if org_id:
            try:
                org = Organisation.objects.get(id=org_id)
                data['organisation'] = OrganisationSerializer(org).data
            except Organisation.DoesNotExist:
                pass

        if project_id:
            try:
                project = Project.objects.get(id=project_id)
                data['project'] = ProjectSerializer(project).data
            except Project.DoesNotExist:
                pass

        return Response(data)

    def update(self, request):
        """Save context to session."""
        org_id = request.data.get('organisationId')
        project_id = request.data.get('projectId')

        if org_id:
            request.session['context_organisation_id'] = org_id

        if project_id:
            request.session['context_project_id'] = project_id
        else:
            request.session.pop('context_project_id', None)

        return Response({'status': 'ok'})
```

#### URLs

```python
# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganisationViewSet, ContextViewSet

router = DefaultRouter()
router.register(r'organisations', OrganisationViewSet, basename='organisation')

urlpatterns = [
    path('', include(router.urls)),
    path('context/', ContextViewSet.as_view({
        'get': 'retrieve',
        'post': 'update',
    })),
]
```

#### Serializers

```python
# serializers.py
from rest_framework import serializers
from .models import Organisation, Project


class OrganisationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = ['id', 'name', 'slug', 'logo', 'metadata']


class ProjectSerializer(serializers.ModelSerializer):
    organisation_id = serializers.CharField(source='organisation.id')

    class Meta:
        model = Project
        fields = ['id', 'name', 'slug', 'organisation_id', 'metadata']
```

### Context Middleware

Create middleware to automatically set context from URL:

```python
# middleware.py
from django.utils.deprecation import MiddlewareMixin
from .models import Organisation, Project


class ContextMiddleware(MiddlewareMixin):
    def process_request(self, request):
        """Extract context from URL and store in request."""
        resolver_match = request.resolver_match

        if not resolver_match:
            return

        org_slug = resolver_match.kwargs.get('org_slug')
        project_slug = resolver_match.kwargs.get('project_slug')

        if org_slug:
            try:
                request.organisation = Organisation.objects.get(slug=org_slug)
                request.session['context_organisation_id'] = str(request.organisation.id)
            except Organisation.DoesNotExist:
                request.organisation = None

        if project_slug and hasattr(request, 'organisation'):
            try:
                request.project = Project.objects.get(
                    slug=project_slug,
                    organisation=request.organisation
                )
                request.session['context_project_id'] = str(request.project.id)
            except Project.DoesNotExist:
                request.project = None
```

Enable in `settings.py`:

```python
MIDDLEWARE = [
    # ... other middleware
    'your_app.middleware.ContextMiddleware',
]
```

---

## Advanced Configuration

### Lifecycle Hooks

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    onBeforeContextChange: async (newContext) => {
      // Confirm unsaved changes
      if (hasUnsavedChanges) {
        const confirmed = window.confirm('You have unsaved changes. Continue?');
        return confirmed; // return false to cancel
      }
      return true;
    },
    onContextChanged: (context) => {
      // Track analytics
      analytics.track('Context Switched', {
        organisationId: context.organisation?.id,
        projectId: context.project?.id,
      });

      // Clear caches
      queryClient.clear();
    },
    onContextError: (error) => {
      // Log error
      console.error('Context switch failed:', error);

      // Show toast
      toast.error('Failed to switch context');
    },
  }}
>
  {children}
</ContextSwitcherProvider>
```

### Custom Labels (i18n)

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    labels: {
      selectOrganisation: 'Seleccionar organización',
      selectProject: 'Seleccionar proyecto',
      searchPlaceholder: 'Buscar...',
      noResults: 'Sin resultados',
      loading: 'Cargando...',
    },
  }}
>
  {children}
</ContextSwitcherProvider>
```

### Keyboard Shortcut Customization

```tsx
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
    keyboardShortcut: 'Control+Shift+K', // Custom shortcut
    // OR disable completely:
    disableKeyboardShortcut: true,
  }}
>
  {children}
</ContextSwitcherProvider>
```

### API Client Configuration

For custom headers, authentication, or base URLs:

```tsx
import { createApiClient } from '@django-core/api-client';

const apiClient = createApiClient({
  baseURL: '/api',
  headers: {
    'X-API-Version': '2024-01',
  },
  withCredentials: true,
});

<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiClient, // Pass custom client
  }}
>
  {children}
</ContextSwitcherProvider>
```

---

## Next Steps

- **[Customization Guide](./customization-guide.md)** - Learn how to style and customize components
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions
- **[Examples](../examples/)** - Complete working examples
