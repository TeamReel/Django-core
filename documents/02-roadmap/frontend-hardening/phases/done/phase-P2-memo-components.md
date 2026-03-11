# P2 — Memo Heavy Components ✅

**Status:** ✅ Done
**Completed:** 2025-07-14
**Effort:** ~1.5 uur

---

## Result

**16 component exports** wrapped in `memo()` across **13 files**.
Baseline was 0 `React.memo` usages — now 16.

## Components Memoized

### Tier 1 — Shell (always mounted, re-render on every route change)

| Component | File | Props |
|-----------|------|-------|
| `Sidebar` | `components/Sidebar.tsx` | `isOpen`, `toggle` |
| `TopNavbar` | `components/TopNavbar.tsx` | `isSidebarOpen`, `onToggleSidebar`, `isMobile`, `onOpenSearchRef` |
| `MobileBottomNav` | `components/MobileBottomNav.tsx` | (none — zero-arg, uses hooks) |
| `SwipeableCard` | `components/SwipeableCard.tsx` | touch/swipe config props |

### Tier 2 — Complex render, frequently re-rendered

| Component | File | Notes |
|-----------|------|-------|
| `DataTable<T>` | `components/ui/DataTable.tsx` | Generic — uses `memo(Inner) as typeof Inner` pattern |
| `BrandProfileCard` | `components/Branding/BrandProfileCard.tsx` | Heavy media + token rendering |
| `MediaAssetCard` | `components/MediaAssetCard.tsx` | Image/video preview + history |
| `ContentCard` | `pages/content/ContentCard.tsx` | Media + text + actions |

### Tier 3 — List items

| Component | File | Notes |
|-----------|------|-------|
| `MatchCard` | `pages/periods/MatchCard.tsx` | Expandable match card |
| `MemberCard` | `pages/identity/MemberCard.tsx` | Member list item |
| `ActiveMatchCard` | `components/dashboard/ActiveMatchCard.tsx` | Dashboard card (zero-arg) |
| `DirectoryTableShell` | `components/DirectoryTableShell.tsx` | Table wrapper for all directories |
| `StatusBadge` | `components/ui/Badge.tsx` | Frequently rendered status indicator |
| `AssetCard` | `pages/medialib/MediaLibCards.tsx` | Media library card |
| `FileCard` | `pages/medialib/MediaLibCards.tsx` | File asset card |
| `MemberMediaCard` | `pages/medialib/MediaLibCards.tsx` | Member media card |

## Pattern Used

```tsx
// Named function export (preserves displayName in DevTools)
import { memo } from 'react';

// Default export
const Sidebar = memo(function Sidebar(props: SidebarProps) { ... });
export default Sidebar;

// Named export
export const MediaAssetCard = memo(function MediaAssetCard(props: MediaAssetCardProps) { ... });

// Generic component (DataTable<T>)
function DataTableInner<T>(props: DataTableProps<T>) { ... }
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
```

## Verification

- [x] 16 `memo()` usages (target was 10+)
- [x] `tsc --noEmit` clean
- [x] `vitest run` — 529/529 tests pass (123 files)
- [x] All wrapped components preserve display names (named function expressions)
