# Phase 39 — Feedback Primitives

**Track:** C3 (UI Primitives)
**Status:** 📋 Planned

## Doel

Feedback components in `demo/src/components/ui/`.

## Components

| Component | Doel |
|-----------|------|
| `Toast` | Notificaties (success, error, info) — vervangt inline toast patronen |
| `Alert` | Inline waarschuwingen (⚠️ patronen) |
| `ConfirmDialog` | Vervangt `window.confirm()` calls |
| `ProgressBar` | Upload/generation progress |

## Checklist

- [ ] Toast component gebouwd + geïntegreerd
- [ ] Alert component gebouwd
- [ ] ConfirmDialog component gebouwd + 3 `window.confirm()` calls vervangen
- [ ] ProgressBar component gebouwd
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
