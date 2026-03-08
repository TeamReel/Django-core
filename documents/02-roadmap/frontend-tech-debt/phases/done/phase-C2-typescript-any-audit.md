# C2 — TypeScript `any` Audit

**Status:** ✅ Done
**Geschatte effort:** 4 uur (iteratief, kan in sprints)
**Scope:** 2.002 `: any` / `as any` usages → typed interfaces

---

## Doel

De TypeScript strict-mode belofte waarmaken. 2.002 `any` usages ondermijnen type safety, developer tooling (autocomplete, refactoring), en bug detectie.

---

## Triage (80/20)

Niet alle `any` zijn even belangrijk. Focus op:

### Prioriteit 1 — API responses (hoogste impact)
```tsx
// Voor:
const data: any = await response.json();

// Na:
interface ApiResponse { id: string; name: string; ... }
const data: ApiResponse = await response.json();
```

### Prioriteit 2 — Component props
```tsx
// Voor:
function Card({ data }: { data: any }) { ... }

// Na:
interface CardProps { data: ProjectData }
function Card({ data }: CardProps) { ... }
```

### Prioriteit 3 — Event handlers
```tsx
// Voor:
const handleChange = (e: any) => { ... }

// Na:
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
```

### Prioriteit 4 — Type assertions (`as any`)
Meestal masking van een type mismatch. Vereist diepere analyse.

---

## Aanpak

1. **Automated scan** — groepeer `any` per bestand en categorie
2. **Generate interfaces** — uit API response types (backend DRF serializers als bron)
3. **Batch replace** — per interface/type
4. **Strict mode check** — `tsc --noEmit` per bestand

---

## Realistische target

**100% eliminatie is niet haalelijk in één fase.** Doel: reduceer van 2.002 → <500 door de top-100 meest gebruikte `any` te typen.

---

## Verificatie

- [ ] `any` count onder 500
- [ ] Alle API response types gedefinieerd
- [ ] Component props getypt
- [ ] `npx vite build` slaagt
- [ ] `tsc --noEmit` op focus-bestanden: 0 errors
