# H2 — .github/ Configuratie Opschonen

> **Effort:** ~2 uur | **Impact:** AI agents werken betrouwbaarder, geen broken referenties

## To do

### Broken referenties fixen
- [ ] `debug.prompt.md` — verwijst naar niet-bestaande `debugger.agent.md`. Fix: inline de debug-workflow of maak de agent aan
- [ ] `refactor.prompt.md` — verwijst naar niet-bestaande `refactoring.agent.md`. Fix: inline de refactor-workflow of maak de agent aan

### copilot-instructions.md updaten
- [ ] Verwijder referenties naar agents die niet bestaan (accessibility, documentation, debugger, refactoring)
- [ ] Update de agent-tabel zodat deze overeenkomt met de 7 bestaande agents
- [ ] Review en update de routing-tabel — kloppen alle signal → action mappings nog?
- [ ] Update de "Available Skills" tabel — kloppen alle 13 skills?
- [ ] Update het "Tech Stack" blok met huidige versies

### Stale prompts evalueren
- [ ] `spec-kitty/` (14 prompts) — wordt dit systeem nog gebruikt? Zo nee: archiveer naar `archive/`
- [ ] Review elke prompt in `.github/prompts/` — verwijder of update verouderde content

### Skills evalueren
- [ ] Controleer dat elke skill in `.github/skills/` een werkende SKILL.md heeft
- [ ] Controleer dat `evals/` folders nog relevant zijn
- [ ] `backend-module/references/` en `backend-module/templates/` — zijn deze up-to-date?

### Instructions valideren
- [ ] `backend.instructions.md` — reflecteert dit de huidige backend conventies?
- [ ] `frontend.instructions.md` — reflecteert dit de huidige frontend patterns?
- [ ] `css.instructions.md` — klopt de token-documentatie nog?
- [ ] `testing.instructions.md` — klopt dit met de huidige test-setup?

## Done criteria

- [ ] Alle prompt-bestanden verwijzen naar bestaande agents/skills
- [ ] copilot-instructions.md agent-tabel matcht de werkelijke 7 agents
- [ ] Geen dode links of referenties in `.github/`
- [ ] Alle 4 instruction-bestanden geverifieerd als actueel
- [ ] Spec-kitty beslissing genomen en uitgevoerd (behouden of archiveren)
