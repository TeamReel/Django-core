---
work_package_id: "WP10"
subtasks:
  - "T113"
  - "T114"
  - "T115"
  - "T116"
  - "T117"
  - "T118"
  - "T119"
  - "T120"
  - "T121"
  - "T122"
  - "T123"
  - "T124"
title: "Documentation & Quickstart Finalization"
phase: "Phase 3 - Quality & Polish"
priority: "P2"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-08T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP10 – Documentation & Quickstart Finalization

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[Empty initially. Reviewers will populate if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Complete packages/auth/README.md, update quickstart.md with real code examples, create Storybook documentation, ensure easy onboarding.

**Success Criteria**:
- [ ] README.md is comprehensive with installation, usage, API reference, troubleshooting
- [ ] All code examples are copy-paste ready (no placeholders)
- [ ] quickstart.md updated with real package name and verified examples
- [ ] Storybook Docs tab includes documentation pages for each component
- [ ] Example app in examples/auth-demo/ shows complete integration
- [ ] New developer can follow README → install → integrate → authenticate in <30 minutes
- [ ] All documentation reviewed and approved

**Independent Test**: New developer (unfamiliar with F02) follows README from scratch → installs package → integrates AuthProvider → mounts SignInPage → successfully authenticates in under 30 minutes.

---

## Context & Constraints

**Prerequisites**:
- WP04-WP08 completed (all features implemented)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/quickstart.md` - Template quickstart guide
- `kitty-specs/023-core-auth-identity/spec.md` - Feature requirements
- `kitty-specs/023-core-auth-identity/plan.md` - Technical architecture
- `.kittify/memory/constitution.md` - Principle VIII (Developer Experience), XI (Documentation)

**Architectural Decisions**:
- **README structure**: Installation → Basic Usage → API Reference → Troubleshooting
- **Code examples**: Must be copy-paste ready, no placeholders like `[YOUR_API_URL]`
- **Example app**: Minimal React SPA demonstrating all auth flows
- **Storybook Docs**: MDX files for each component category

**Constraints**:
- All code examples must be tested (copy-paste into test project, verify they work)
- Package name: `@django-core/auth-ui` (or actual final name from package.json)
- Troubleshooting section must cover common errors from research.md
- Example app must be minimal (avoid over-engineering)

---

## Subtasks & Detailed Guidance

### Subtask T113 – Write packages/auth/README.md with Complete API Reference

**Purpose**: Create comprehensive package documentation.

**Steps**:
1. Create `packages/auth/README.md`
2. Structure:
   ```markdown
   # @django-core/auth-ui

   > React components and hooks for Django authentication

   ## Features
   - Sign-in, sign-out, password reset flows
   - Profile management
   - Session verification
   - TypeScript support
   - WCAG 2.1 AA accessible

   ## Installation
   [See T114]

   ## Basic Usage (SPA)
   [See T116]

   ## Django Integration
   [See T117]

   ## API Reference
   ### Components
   - `<AuthProvider>` - Context provider
   - `<SignInPage>` - Complete sign-in page
   - `<SignInForm>` - Primitive sign-in form
   - ... [all components]

   ### Hooks
   - `useAuth()` - Access auth context
   - `useSignIn()` - Sign-in hook
   - ... [all hooks]

   ### Types
   - `AuthConfig` - Configuration interface
   - `User` - User data interface
   - ... [all types]

   ## Customization
   [See T118]

   ## Troubleshooting
   [See T119]

   ## License
   MIT
   ```
3. API reference: Document all exports (components, hooks, types) with parameters, return values, examples

**Validation**:
- README is comprehensive and scannable
- All API exports documented

**Files Modified**:
- `packages/auth/README.md` (new)

---

### Subtask T114 – Add Installation Instructions

**Purpose**: Guide users through package installation.

**Steps**:
1. Add Installation section to README:
   ```markdown
   ## Installation

   ```bash
   # Using pnpm
   pnpm add @django-core/auth-ui @django-core/design-system react react-dom

   # Using npm
   npm install @django-core/auth-ui @django-core/design-system react react-dom

   # Using yarn
   yarn add @django-core/auth-ui @django-core/design-system react react-dom
   ```

   ### Peer Dependencies
   - React 18.x
   - @django-core/design-system 1.x
   ```
2. Note: Actual package name from package.json (T002 in WP01)

**Validation**:
- Installation commands are correct
- Peer dependencies listed

---

### Subtask T115 – Document AuthConfig Type with All Options and Examples

**Purpose**: Explain all configuration options.

**Steps**:
1. Add AuthConfig documentation:
   ```markdown
   ## Configuration

   The `<AuthProvider>` component accepts a `config` prop with the following options:

   ```typescript
   interface AuthConfig {
     apiBaseUrl: string; // Django API base URL, e.g., 'https://api.example.com/api/v1'
     routes: {
       login: string; // Default: '/auth/login'
       afterLogout: string; // Default: '/'
       defaultAfterLogin: string; // Default: '/dashboard'
     };
     security?: {
       enableSessionPolling?: boolean; // Default: false
       sessionPollingInterval?: number; // Default: 300000 (5 minutes)
     };
   }
   ```

   ### Example
   ```typescript
   const config: AuthConfig = {
     apiBaseUrl: 'https://api.example.com/api/v1',
     routes: {
       login: '/sign-in',
       afterLogout: '/goodbye',
       defaultAfterLogin: '/home',
     },
     security: {
       enableSessionPolling: true,
       sessionPollingInterval: 600000, // 10 minutes
     },
   };
   ```
   ```

**Validation**:
- All config options documented
- Example is copy-paste ready

---

### Subtask T116 – Add "Basic Usage (SPA)" Section with Code Examples

**Purpose**: Show minimal integration in React SPA.

**Steps**:
1. Copy examples from quickstart.md, verify they work
2. Add Basic Usage section:
   ```markdown
   ## Basic Usage (SPA)

   ### 1. Wrap your app with AuthProvider

   ```typescript
   import { AuthProvider } from '@django-core/auth-ui';
   import { BrowserRouter } from 'react-router-dom';

   const config = {
     apiBaseUrl: 'http://localhost:8000/api/v1',
     routes: {
       login: '/auth/login',
       afterLogout: '/',
       defaultAfterLogin: '/dashboard',
     },
   };

   function App() {
     return (
       <AuthProvider config={config}>
         <BrowserRouter>
           {/* Your app routes */}
         </BrowserRouter>
       </AuthProvider>
     );
   }
   ```

   ### 2. Use auth pages

   ```typescript
   import { SignInPage, ProfilePage } from '@django-core/auth-ui';
   import { Routes, Route } from 'react-router-dom';

   function AppRoutes() {
     return (
       <Routes>
         <Route path="/auth/login" element={<SignInPage />} />
         <Route path="/profile" element={<ProfilePage />} />
         {/* Other routes */}
       </Routes>
     );
   }
   ```

   ### 3. Access auth state in your components

   ```typescript
   import { useAuth } from '@django-core/auth-ui';

   function Dashboard() {
     const { user, signOut } = useAuth();

     return (
       <div>
         <h1>Welcome, {user?.first_name}</h1>
         <button onClick={signOut}>Sign Out</button>
       </div>
     );
   }
   ```
   ```

**Validation**:
- Examples are copy-paste ready
- Imports use actual package name

---

### Subtask T117 – Add "Django Integration" Section with Template Examples

**Purpose**: Show how to integrate with Django templates.

**Steps**:
1. Copy examples from quickstart.md
2. Add Django Integration section:
   ```markdown
   ## Django Integration

   ### 1. Include auth UI script in Django template

   ```html
   <!-- templates/base.html -->
   {% load static %}
   <!DOCTYPE html>
   <html>
   <head>
     <link rel="stylesheet" href="{% static 'auth-ui/styles.css' %}">
   </head>
   <body>
     <div id="auth-root"></div>
     <script src="{% static 'auth-ui/bundle.js' %}"></script>
     <script>
       window.AuthUI.init({
         apiBaseUrl: '{{ request.scheme }}://{{ request.get_host }}/api/v1',
         routes: {
           login: '/auth/login',
           afterLogout: '/',
           defaultAfterLogin: '/dashboard',
         },
       });
     </script>
   </body>
   </html>
   ```

   ### 2. Configure Django CORS and CSRF

   ```python
   # settings.py
   CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
   CORS_ALLOW_CREDENTIALS = True
   CSRF_COOKIE_HTTPONLY = False  # Allow JS to read CSRF token
   SESSION_COOKIE_SAMESITE = 'Lax'
   ```
   ```

**Validation**:
- Django template example is realistic
- CORS/CSRF configuration documented

---

### Subtask T118 – Add "Customization" Section

**Purpose**: Show how to use form primitives and customize behavior.

**Steps**:
1. Add Customization section:
   ```markdown
   ## Customization

   ### Using Form Primitives

   Instead of full pages, you can use form components directly:

   ```typescript
   import { SignInForm } from '@django-core/auth-ui';

   function CustomLoginPage() {
     const navigate = useNavigate();

     const handleSuccess = (user) => {
       console.log('Signed in:', user);
       navigate('/custom-dashboard');
     };

     return (
       <div className="my-custom-layout">
         <h1>Welcome Back</h1>
         <SignInForm onSuccess={handleSuccess} />
       </div>
     );
   }
   ```

   ### Custom Redirect Logic

   ```typescript
   import { AuthProvider, redirectHelper } from '@django-core/auth-ui';

   const config = {
     apiBaseUrl: 'http://localhost:8000/api/v1',
     routes: {
       login: '/sign-in',
       afterLogout: '/goodbye',
       defaultAfterLogin: (user) => {
         return user.is_staff ? '/admin' : '/dashboard';
       },
     },
   };
   ```
   ```

**Validation**:
- Customization examples are practical
- Show both form primitives and custom logic

---

### Subtask T119 – Add "Troubleshooting" Section

**Purpose**: Document common errors and solutions.

**Steps**:
1. Review research.md for common errors
2. Add Troubleshooting section:
   ```markdown
   ## Troubleshooting

   ### CSRF Token Error (403 Forbidden)

   **Problem**: POST requests fail with 403 Forbidden.

   **Solution**: Ensure Django sends CSRF cookie and apiClient includes it in headers.
   - Django: Set `CSRF_COOKIE_HTTPONLY = False` in settings.py
   - Check browser cookies for `csrftoken`
   - Verify apiClient reads cookie and adds `X-CSRFToken` header

   ### Session Not Persisting (401 on /auth/me)

   **Problem**: User signs in successfully but `/auth/me` returns 401.

   **Solution**: Check session cookie configuration.
   - Django: Set `SESSION_COOKIE_SAMESITE = 'Lax'` and `SESSION_COOKIE_HTTPONLY = True`
   - Ensure `credentials: 'include'` in apiClient fetch options
   - Verify browser cookies for `sessionid`

   ### Password Validation Mismatch

   **Problem**: Client-side validation passes but backend rejects password.

   **Solution**: Ensure client-side validation rules match backend rules from research.md:
   - Min 8 characters
   - At least 1 uppercase, 1 lowercase, 1 number, 1 special character

   ### Redirect Loop (Login → Dashboard → Login)

   **Problem**: After sign-in, user is redirected back to login.

   **Solution**: Check `/auth/me` response. If 401, session not created properly.
   - Verify POST `/auth/login` returns `Set-Cookie` header
   - Check CORS configuration: `CORS_ALLOW_CREDENTIALS = True`

   ### TypeScript Errors

   **Problem**: Type errors when importing package.

   **Solution**: Ensure peer dependencies installed:
   ```bash
   pnpm add @django-core/design-system react react-dom
   ```
   ```

**Validation**:
- Common errors from research.md covered
- Solutions are actionable

---

### Subtask T120 – Update quickstart.md with Real Package Name and Verified Examples

**Purpose**: Ensure quickstart guide is accurate.

**Steps**:
1. Open `kitty-specs/023-core-auth-identity/quickstart.md`
2. Replace placeholders:
   - `[@django-core/auth-ui]` → actual package name from package.json
   - `[YOUR_API_URL]` → `http://localhost:8000/api/v1` (example)
3. Verify all code examples match README (consistency)

**Validation**:
- No placeholders remain
- Examples match README

**Files Modified**:
- `kitty-specs/023-core-auth-identity/quickstart.md` (update)

---

### Subtask T121 – Test All Code Examples in README/Quickstart

**Purpose**: Ensure examples are copy-paste ready and work.

**Steps**:
1. Create temporary test project:
   ```bash
   pnpm create vite test-auth-ui --template react-ts
   cd test-auth-ui
   pnpm install
   ```
2. Install F02 package (local build):
   ```bash
   pnpm add ../packages/auth
   pnpm add @django-core/design-system react-router-dom
   ```
3. Copy each code example from README into test project
4. Run test project: `pnpm dev`
5. Verify examples work as expected
6. Fix any errors in README

**Validation**:
- All code examples work without modification
- No import errors, no runtime errors

---

### Subtask T122 – Add Storybook Documentation Pages

**Purpose**: Provide in-Storybook docs for each component.

**Steps**:
1. Create MDX files in `.storybook/`:
   - `Introduction.mdx` - Overview of F02
   - `GettingStarted.mdx` - Installation and basic usage
   - `Components.mdx` - Components overview
   - `Hooks.mdx` - Hooks overview
2. Example `Introduction.mdx`:
   ```mdx
   import { Meta } from '@storybook/blocks';

   <Meta title="Docs/Introduction" />

   # @django-core/auth-ui

   React components and hooks for Django authentication.

   ## Features
   - Sign-in, sign-out, password reset flows
   - Profile management
   - Session verification
   - TypeScript support
   - WCAG 2.1 AA accessible

   ## Quick Links
   - [Installation](/?path=/docs/docs-getting-started--docs)
   - [Components](/?path=/docs/docs-components--docs)
   - [Hooks](/?path=/docs/docs-hooks--docs)
   ```
3. Configure Storybook to show Docs tab

**Validation**:
- Storybook Docs tab shows documentation pages
- All links work

**Files Modified**:
- `.storybook/Introduction.mdx` (new)
- `.storybook/GettingStarted.mdx` (new)
- `.storybook/Components.mdx` (new)
- `.storybook/Hooks.mdx` (new)
- `.storybook/main.ts` (configure docs)

---

### Subtask T123 – Create Example App in examples/auth-demo/

**Purpose**: Demonstrate complete integration.

**Steps**:
1. Create `examples/auth-demo/` directory
2. Initialize minimal React SPA:
   ```bash
   cd examples
   pnpm create vite auth-demo --template react-ts
   cd auth-demo
   pnpm install
   pnpm add ../../packages/auth
   pnpm add @django-core/design-system react-router-dom
   ```
3. Implement example app:
   - `src/App.tsx` - AuthProvider + Router
   - `src/pages/SignIn.tsx` - Use SignInPage
   - `src/pages/Profile.tsx` - Use ProfilePage
   - `src/pages/Dashboard.tsx` - Show authenticated user
4. Add README.md in examples/auth-demo/ with setup instructions
5. Example `src/App.tsx`:
   ```typescript
   import { AuthProvider, SignInPage, ProfilePage } from '@django-core/auth-ui';
   import { BrowserRouter, Routes, Route } from 'react-router-dom';
   import { Dashboard } from './pages/Dashboard';

   const config = {
     apiBaseUrl: 'http://localhost:8000/api/v1',
     routes: {
       login: '/auth/login',
       afterLogout: '/',
       defaultAfterLogin: '/dashboard',
     },
   };

   function App() {
     return (
       <AuthProvider config={config}>
         <BrowserRouter>
           <Routes>
             <Route path="/" element={<div>Home</div>} />
             <Route path="/auth/login" element={<SignInPage />} />
             <Route path="/profile" element={<ProfilePage />} />
             <Route path="/dashboard" element={<Dashboard />} />
           </Routes>
         </BrowserRouter>
       </AuthProvider>
     );
   }

   export default App;
   ```

**Validation**:
- Example app runs: `pnpm dev`
- All auth flows work (sign-in, sign-out, profile, password reset)
- Example is minimal (no over-engineering)

**Files Modified**:
- `examples/auth-demo/` (new directory)
- `examples/auth-demo/README.md` (new)
- `examples/auth-demo/src/App.tsx` (new)
- Other example files

---

### Subtask T124 – Record Demo Video or GIF

**Purpose**: Visual demonstration of auth flows (optional).

**Steps**:
1. Optional: Record screen demo showing:
   - Sign-in flow
   - Password reset flow
   - Profile update
   - Sign-out
2. Tool: OBS Studio, QuickTime, or ScreenToGif
3. Upload to examples/auth-demo/ or link in README
4. If skipped: Mark as optional enhancement

**Validation**:
- Demo video shows all major flows
- Video embedded or linked in README

---

## Parallel Execution Strategy

**Parallel Group 1** (documentation writing):
- T113-T119 (README sections)
- T122 (Storybook docs)

**Parallel Group 2** (example app):
- T123 (example app)
- T124 (demo video)

**Sequential**:
- T120 (update quickstart) after T113-T119
- T121 (test examples) after T113-T120

---

## Testing & Validation Checklist

**Documentation**:
- [ ] README.md is comprehensive and scannable
- [ ] All code examples are copy-paste ready
- [ ] No placeholders remain
- [ ] Troubleshooting covers common errors
- [ ] API reference documents all exports

**Examples**:
- [ ] All code examples tested and work
- [ ] Example app runs and demonstrates all flows
- [ ] Storybook docs render correctly

**Onboarding Test**:
- [ ] New developer follows README → installs → integrates → authenticates in <30 minutes

---

## Definition of Done

- [ ] All subtasks (T113-T124) completed
- [ ] README.md comprehensive and tested
- [ ] quickstart.md updated and verified
- [ ] Example app functional
- [ ] Storybook docs complete
- [ ] All code examples work
- [ ] Documentation reviewed and approved
- [ ] Merged to feature branch

---

## Risk Mitigation

**Risk**: Outdated examples
**Mitigation**: Test all code snippets in CI, use actual package in example app

**Risk**: Unclear instructions
**Mitigation**: Have external developer test setup process, gather feedback

**Risk**: Example app too complex
**Mitigation**: Keep minimal, only demonstrate core features, avoid over-engineering

**Risk**: Placeholders remain
**Mitigation**: Search for `[`, `YOUR`, `TODO` in all docs before finalizing

---

## Notes for Implementer

- **Testing examples**: Critical—don't skip T121
- **Example app**: Keep minimal, focus on clarity over features
- **Troubleshooting**: Use real errors from development (research.md)
- **Storybook docs**: Optional but valuable for discoverability

**Common Pitfalls**:
- Not testing code examples (they break after copy-paste)
- Using placeholders like `[YOUR_API_URL]` (users don't know what to replace)
- Over-engineering example app (keep it minimal)
- Skipping troubleshooting section (users will encounter errors)

---

## Constitutional Compliance

**Principle VIII (Developer Experience)**:
- Easy setup
- Clear documentation
- Working examples
- Under 30 minutes to first authentication

**Principle XI (Documentation)**:
- In-repo docs (README.md)
- Getting started guide (quickstart.md)
- Example app (examples/auth-demo/)
- Troubleshooting guide

---

## Handoff to Next Work Package

**Output Artifacts**:
- `packages/auth/README.md` - Complete documentation
- Updated `quickstart.md`
- `examples/auth-demo/` - Working example app
- Storybook docs (MDX files)

**Next WP (WP11, WP12)** can proceed in parallel—documentation complete.

---

**Prompt Version**: 1.0
**Last Updated**: 2025-12-08
**Maintainer**: F02 Implementation Team
