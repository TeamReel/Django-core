# H14 — Asset Pipeline splitsen

> **Effort:** ~3 uur | **Impact:** Navigeerbaarheid, separation of concerns

## Context

`src/generative/services/asset_pipeline.py` is met **2616 LOC** het grootste bestand in de hele codebase. Het combineert:
- Image preprocessing (logo/sponsor preparation)
- Prompt building voor AI modellen
- Gemini API calls (image generation)
- MiniMax API calls (video generation)
- Polling/retry logica

Dit maakt het bestand moeilijk te navigeren en te onderhouden.

## To do

- [ ] Analyseer `asset_pipeline.py` — identificeer logische secties
- [ ] Split in gerichte modules:
  - `src/generative/services/preprocessing.py` — image preprocessing (`_preprocess_logo`, `_preprocess_sponsor`, etc.)
  - `src/generative/services/prompt_builder.py` — prompt construction logica
  - `src/generative/services/gemini_client.py` — Gemini API calls + retry
  - `src/generative/services/minimax_client.py` — MiniMax API calls + polling
  - `src/generative/services/asset_pipeline.py` — orchestratie (importeert bovenstaande)
- [ ] Barrel imports in `asset_pipeline.py` voor backward compatibility
- [ ] Check of `_asset_helpers.py` (1701 LOC) ook split-candidates heeft

### Bestanden
- `src/generative/services/asset_pipeline.py` (2616 LOC → ~500 LOC orchestratie)
- `src/generative/services/preprocessing.py` (NIEUW)
- `src/generative/services/prompt_builder.py` (NIEUW)
- `src/generative/services/gemini_client.py` (NIEUW)
- `src/generative/services/minimax_client.py` (NIEUW)

## Done criteria

- [ ] `asset_pipeline.py` < 600 LOC (was 2616)
- [ ] Elk nieuw bestand < 800 LOC
- [ ] Alle imports die naar `asset_pipeline` verwijzen blijven werken (barrel)
- [ ] Alle bestaande tests slagen
- [ ] AI generatie workflow onveranderd
