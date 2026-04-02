# 02 — Infra & Tooling

| | |
|---|---|
| Focus | Developer tooling, security, performance, documentatie |
| Prioriteit | � Hoog — technical debt opruimen voor nieuwe features |
| Status | 8 TODO · 0 REVIEW · 0 DONE |

## Scope

Infrastructuur, tooling en developer experience:
- **Modal & wizard refactoring** (technical debt — 87 overlay componenten opruimen)
- Frontend form components en rich text editor
- Import/export & reporting
- Stack & dependency validation (CVE scanning)
- AI structured output validation & tool-call logging
- Documentatie actualiseren

## Bouwvolgorde

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | BE-documentatie-actualiseren (H5) | ~4u | 🟡 |
| 2 | AI-structured-output-validation (D06) | ~20u | 🟡 |
| 3 | AI-tool-call-logging (D07) | ~15u | 🟡 |
| 4 | FE-frontend-form-components (F15) | ~20u | 🟡 |
| 5 | BE-import-export-reporting (B45) | ~30u | 🟡 |
| 6 | FE-rich-text-editor (F13) | ~20u | 🟢 |
| 7 | INFRA-stack-dependency-validation (P05) | ~15u | 🟢 |
| 8 | **FE-modal-wizard-refactoring** | ~40u | 🔴 |

*API keys/OAuth, webhooks en changelog verplaatst naar icebox.*
