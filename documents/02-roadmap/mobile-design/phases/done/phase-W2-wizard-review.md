# Phase W2 — Wizard Review Step

**Track:** W (Wizard & Overlays) | **Layer:** 3
**Status:** Done | **Previously:** B2

Grotere preview + samenvatting voor generatie in wizard review-stap.

## Implementation Notes
- Added `'review'` as new WizardStep between content/lineup selection and generation
- Large 16:9 gradient preview area with output-type icon (48px) and badge
- Summary card shows: match title (Calendar icon), date/time (Clock), location (MapPin), lineup status (Check)
- Content type label + description centered below preview
- "Verder" button on lineup step now routes to review; "Genereer content" on review step
- Back navigation: review → lineup (if lineup required) or review → content
- Hook exposes `handleReviewConfirm` for final generation trigger
- Gradient palette consistent with W1 thumbnails (video=indigo, image=teal, text=amber)
