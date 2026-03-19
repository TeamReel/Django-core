# Skill Evals — Handleiding

## Doel

Test of skills betrouwbaar de juiste output produceren. Vergelijk output **met skill** vs **zonder skill** om te meten of de skill daadwerkelijk waarde toevoegt.

---

## Stap 1: Kies een eval

Eval cases staan in elke skill map:

```
.github/skills/<skill-name>/evals/evals.json
```

Beschikbaar:
- `ui-review` — 3 test cases (dashboard, ContentStreakWidget, MediaReadinessCard)
- `frontend-component` — 2 test cases (TeamStatsCard, NotificationBell)
- `api-endpoint` — 2 test cases (team notities, match highlights)
- `backend-module` — 1 test case (team polls app)

---

## Stap 2: Run MET skill (nieuwe chat)

1. **Open een nieuwe Copilot chat** (Ctrl+Shift+I of via zijbalk)
2. Kopieer de prompt uit `evals.json`
3. Laat de agent werken tot hij klaar is
4. **Sla de volledige chat output op** — kopieer naar een bestand:

```
.github/skills/<skill-name>/evals/results/iteration-1/eval-<id>/with_skill/output.md
```

5. Noteer wat de agent deed:
   - Welke files las hij?
   - Welke skill/instructions laadde hij?
   - Wat produceerde hij?

---

## Stap 3: Run ZONDER skill (baseline)

1. **Hernoem tijdelijk** de SKILL.md:
   ```powershell
   Rename-Item ".github/skills/<skill-name>/SKILL.md" "SKILL.md.bak"
   ```
2. Open een **nieuwe chat**, zelfde prompt
3. Sla output op naar:
   ```
   .github/skills/<skill-name>/evals/results/iteration-1/eval-<id>/without_skill/output.md
   ```
4. **Zet de skill terug**:
   ```powershell
   Rename-Item ".github/skills/<skill-name>/SKILL.md.bak" "SKILL.md"
   ```

---

## Stap 4: Laat mij evalueren

Kom terug in deze chat (of een nieuwe) en zeg:

```
Evalueer de skill eval resultaten voor <skill-name> eval <id>
```

Ik lees dan de output van with_skill/ en without_skill/, beoordeel elke assertion, en maak een grading.json aan.

---

## Stap 5: Bekijk resultaten

Na evaluatie staat per eval:

```
evals/results/iteration-1/eval-<id>/
  with_skill/
    output.md       ← jij plakt hier de chat output
    grading.json    ← ik maak dit na evaluatie
  without_skill/
    output.md       ← jij plakt hier de baseline output
    grading.json    ← ik maak dit na evaluatie
```

Plus een `benchmark.json` met de vergelijking.

---

## Quick Start: UI Review van Dashboard

Dit is de makkelijkste om mee te beginnen — geen code wijzigingen, alleen een review.

### Stap A: Met skill
1. Nieuwe chat openen
2. Prompt: **"Review de dashboard pagina op accessibility en design tokens"**
3. Output kopiëren → `.github/skills/ui-review/evals/results/iteration-1/eval-1/with_skill/output.md`

### Stap B: Zonder skill
1. `Rename-Item ".github/skills/ui-review/SKILL.md" "SKILL.md.bak"`
2. Nieuwe chat, zelfde prompt
3. Output kopiëren → `.github/skills/ui-review/evals/results/iteration-1/eval-1/without_skill/output.md`
4. `Rename-Item ".github/skills/ui-review/SKILL.md.bak" "SKILL.md"`

### Stap C: Evalueren
Kom terug en zeg: **"Evalueer ui-review eval 1"**

---

## Tips

- **Begin met ui-review eval 1** — geen side effects, makkelijk vergelijkbaar
- **Eén eval per keer** — doe niet alles tegelijk
- **Frontend-component en api-endpoint evals maken bestanden aan** — gebruik een git branch of revert na de run
- **Wees eerlijk in de output** — kopieer de volledige chat, niet alleen de conclusie
