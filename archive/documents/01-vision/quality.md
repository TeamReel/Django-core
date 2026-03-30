# Quality Standards

The core platform's 80% foundation must meet production-grade standards so products inherit quality by default.

## 1. Security & Privacy
*   **Organisation-scoped querysets**: On every ViewSet — tenant isolation guaranteed.
*   **Permission classes**: On every endpoint — no unauthenticated access to data.
*   **Audit logging**: Security events tracked.
*   **Secrets management**: Environment variables only, never hardcoded.
*   **Safe migrations**: Never drop tables, never lose data.

## 2. Content & Media
*   **File management**: S3-based with FileAsset abstraction.
*   **AI generation**: OpenAI and Google Generative AI for content creation.
*   **Video processing**: FFmpeg pipeline for branded video exports.
*   **Background processing**: Celery tasks for heavy workloads.

## 3. Performance
*   **No N+1 queries**: `select_related`/`prefetch_related` on all ViewSets.
*   **Async processing**: Celery for background jobs (video, AI, email).
*   **Caching**: Redis for session and query caching.

## 4. Frontend Quality
*   **TypeScript strict mode**: No `any` types.
*   **Design tokens**: CSS variables for all visual properties — no hardcoded values.
*   **Mobile-first**: Responsive design as default.
*   **Accessibility**: WCAG 2.1 AA, `:focus-visible`, touch targets >= 44x44px, `prefers-reduced-motion` support.

## 5. Testing
*   **Backend**: pytest for all features and bugfixes.
*   **Frontend**: Playwright for critical E2E flows.
*   **Regression**: Every bugfix includes a regression test.
*   **Verification**: `pytest` (backend), `npx tsc --noEmit` + `npx vite build` (frontend).

## 6. Developer Experience
*   **Conventions**: Documented in `.github/instructions/` files.
*   **Type hints**: Python type hints on all functions.
*   **Git**: Conventional commits, push to `main`.
