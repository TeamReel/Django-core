# Constitutional Governance

The Core-App uses **Spec-Driven Development (SDD)** with **constitutional enforcement** to guarantee quality even when built by non-programmers using AI agents.

## The Constitutional Workflow

1.  **Constitution**: Defines non-negotiable quality rules (security, testing, accessibility, performance).
2.  **Constitutional Enforcement Engine (B02)**: Validates every change against the constitution automatically.
3.  **Spec-Driven Development**: Every feature starts with a spec, not code.
4.  **AI Agents Build**: GitHub Copilot, ChatGPT and Spec Kitty implement under strict rules.
5.  **Quality Gates**: Automated checks prevent merging anything that violates standards.
6.  **Platform Gates (P01-P04)**: Periodic hardening sprints validate the entire platform.

## Why This Matters for Non-Programmers

**Without constitutional governance:** AI agents can produce working but insecure, untestable or unmaintainable code.

**With constitutional governance:**
*   AI agents cannot bypass security rules (enforced in CI).
*   Test coverage requirements prevent untested code from merging.
*   Accessibility and performance standards are validated automatically.
*   Platform gates catch architectural drift before it becomes technical debt.

**Result:** Quality is structurally guaranteed, not dependent on individual expertise.
