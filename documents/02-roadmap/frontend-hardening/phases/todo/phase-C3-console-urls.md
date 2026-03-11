# C3 — Console & Hardcoded URLs

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** 9 console statements + 17 hardcoded URLs + 3 dangerouslySetInnerHTML

---

## Doel

Laatste console.* statements verwijderen of door logger utility vervangen. Hardcoded URLs naar environment config verplaatsen. dangerouslySetInnerHTML vervangen door veilige alternatieven.

## Current State

- 9 `console.(log|warn|error|info|debug)` in productie-code
- 17 hardcoded `https://` URLs (niet localhost)
- 3 `dangerouslySetInnerHTML` (XSS-risico)

## Acties

### Console (9×)
1. Verwijder debug-only `console.log` statements
2. Vervang error-logging door bestaande `logger` utility
3. Verifieer dat geen user-facing functionaliteit break

### Hardcoded URLs (17×)
1. Identificeer welke URLs environment-afhankelijk zijn (API, CDN, etc.)
2. Verplaats naar `env.ts` config of `.env` variabelen
3. Statische URLs (docs links, GitHub, etc.) mogen blijven

### dangerouslySetInnerHTML (3×)
1. Analyseer of de content user-generated is (XSS-risico)
2. Vervang door sanitized rendering of React component-based approach
3. Indien noodzakelijk: voeg DOMPurify sanitizer toe

## Verificatie

- [ ] 0 `console.*` in productie-code
- [ ] 0 hardcoded URLs die environment-afhankelijk zijn
- [ ] 0 `dangerouslySetInnerHTML` (of gedocumenteerd + gesanitized)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
