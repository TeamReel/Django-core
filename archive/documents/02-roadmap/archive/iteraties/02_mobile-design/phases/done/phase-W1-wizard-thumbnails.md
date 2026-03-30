# Phase W1 — Wizard Thumbnails

**Track:** W (Wizard & Overlays) | **Layer:** 3
**Status:** Done | **Previously:** B1

Content-type cards met thumbnail previews in wizard stap 2.

## Implementation notes
- Added `OutputType` ('video' | 'image' | 'text') and `ContentType` interface to matchWizardTypes
- All 12 content types now have explicit `outputType` field
- Content type cards redesigned with 56x56px gradient thumbnail area:
  - Video types: indigo→violet gradient
  - Image types: teal→emerald gradient
  - Text types: amber→yellow gradient
- Lucide icon rendered large (28px) as placeholder thumbnail; supports `thumbnail` URL for real previews
- Output type badge (VIDEO/IMAGE/TEXT) positioned bottom-right of thumbnail area
- Card border-radius increased (14px), gap/padding tuned for visual weight
- Added hover (box-shadow) + active (scale 0.97) states on content cards
- Also added active states to match cards, phase tabs, header buttons, primary button
- "Opstelling nodig" indicator changed from parenthesized to dot-separated
