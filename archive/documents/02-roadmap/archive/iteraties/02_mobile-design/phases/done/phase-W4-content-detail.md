# Phase W4 — Content Detail Page

**Track:** W (Wizard & Overlays) | **Layer:** 3
**Status:** Done | **Previously:** E1

Full-size preview met video player + metadata card.

## Implementation Notes
- Redesigned ContentPreviewModal in ContentCard.tsx: mobile-first BottomSheet style
- Panel: slides up from bottom (mobile), centered modal (desktop ≥640px), 20px rounded corners
- Full-size preview area: video with native controls + play/pause overlay, images with object-contain
- Type badge (VIDEO/IMAGE/FILE) top-right with backdrop-filter blur
- Metadata card: activity title (Calendar), club name (Tag), date + file size (Clock), mime type (FileText)
- Tags rendered as styled chips
- Action bar: Download (primary), Delen, Verwijder — all 44px min touch targets
- Safe-area-inset-bottom on action bar for notched devices
- Slide-up + fade-in animations, active scale(0.95) on all buttons
- Mobile overrides: smaller preview (40vh max), compact action buttons
- Backward compatible: onDownload/onShare/onDelete props are optional
