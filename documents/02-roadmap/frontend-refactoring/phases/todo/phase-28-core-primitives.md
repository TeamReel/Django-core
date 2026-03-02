# Phase 28 — Core UI Primitives

**Track:** C1 (UI Primitives)
**Status:** 📋 Planned

## Doel

Eerste set herbruikbare atomic components in `demo/src/components/ui/`.

> Button, Input, Textarea komen al uit `@django-core/design-system`. Hier alleen wat daar NIET in zit.

## Components

| Component | Herhaald in | Key Props |
|-----------|-------------|-----------|
| `Modal` | 15+ modals | `isOpen`, `onClose`, `title`, `size` |
| `Card` | AssetCard, MetricCard, UserCard | `padding`, `variant`, `onClick` |
| `Badge` | Status badges, count badges | `variant`, `color`, `children` |
| `IconButton` | Close buttons, action buttons | `icon`, `variant`, `size`, `tooltip` |
| `DataTable` | UsersList, ContentLibrary | `columns`, `data`, `sort`, `pagination` |

## Aanpak

1. Scan de codebase voor de meest herhaalde patronen
2. Extract het beste voorbeeld als basis
3. Generaliseer met props (variant, size, etc.)
4. Maak `components/ui/index.ts` barrel export
5. Migreer 2-3 bestaande consumers als proof of concept

## Checklist

- [ ] `components/ui/` map aangemaakt
- [ ] Modal primitive gebouwd + 2 consumers gemigreerd
- [ ] Card primitive gebouwd + 2 consumers gemigreerd
- [ ] Badge primitive gebouwd
- [ ] IconButton primitive gebouwd
- [ ] DataTable primitive gebouwd (basis)
- [ ] Barrel export in `components/ui/index.ts`
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
