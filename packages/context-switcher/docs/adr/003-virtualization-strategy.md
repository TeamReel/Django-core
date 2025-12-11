# ADR-003: Virtualization Strategy for Large Lists

**Status:** Accepted

**Date:** 2024-12-11

**Deciders:** @django-core/frontend-team

---

## Context

Enterprise applications can have hundreds or thousands of organisations and projects. Rendering all items in a list creates performance problems:

- **Slow initial render**: Rendering 1000+ DOM nodes takes time
- **High memory usage**: Each DOM node consumes memory
- **Sluggish scrolling**: Browser struggles with large DOM trees
- **Poor UX**: Users perceive the application as slow

Example scenario:
- Organisation with 2000 members
- Each member's projects listed
- Total: 5000+ project items to render

We need a solution that:
1. Renders large lists efficiently
2. Maintains smooth scrolling
3. Uses minimal memory
4. Works with search/filtering
5. Is accessible (keyboard navigation, screen readers)

## Decision

We will use **`react-window`** for virtualized list rendering in the organisation and project pickers.

### Implementation

```typescript
import { FixedSizeList } from 'react-window';

function OrganisationPicker({ isOpen, onClose }: OrganisationPickerProps) {
  const { organisations } = useContextSwitcher();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Filter based on search
  const filteredOrgs = useMemo(
    () =>
      organisations.filter((org) =>
        org.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [organisations, debouncedSearch]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <SearchInput value={search} onChange={setSearch} />

      {/* Only renders visible items + buffer */}
      <FixedSizeList
        height={400}
        itemCount={filteredOrgs.length}
        itemSize={56} // 56px per item
        width="100%"
      >
        {({ index, style }) => (
          <OrganisationListItem
            organisation={filteredOrgs[index]}
            style={style}
            onSelect={() => handleSelect(filteredOrgs[index])}
          />
        )}
      </FixedSizeList>
    </Modal>
  );
}
```

## Rationale

### Why react-window?

**Performance:**
- Only renders visible items (10-20) instead of all items (1000+)
- Recycles DOM nodes as user scrolls
- ~60fps scrolling even with 10,000+ items

**Small Bundle Size:**
- ~6KB minified + gzipped
- Much smaller than react-virtualized (~30KB)

**Simple API:**
- `FixedSizeList` for uniform item heights
- `VariableSizeList` for dynamic heights (future)
- Easy to integrate with existing components

**Maintained:**
- Created by Brian Vaughn (React core team)
- Active development and community support
- Used by major applications (GitHub, Twitter, etc.)

**Accessibility:**
- Maintains semantic HTML structure
- Works with screen readers
- Keyboard navigation supported

### Automatic Activation

Virtualization is **always enabled** in the built-in pickers, with no configuration needed:

```tsx
// ✅ Automatically virtualized
<OrganisationPicker isOpen={isOpen} onClose={onClose} />
<ProjectPicker isOpen={isOpen} onClose={onClose} />
```

Users never need to think about virtualization unless building custom pickers.

### Performance Characteristics

| Items | Without Virtualization | With Virtualization |
|-------|------------------------|---------------------|
| 10 | ~5ms render | ~5ms render |
| 100 | ~50ms render | ~5ms render |
| 1,000 | ~500ms render | ~5ms render |
| 10,000 | ~5s render (freezes) | ~5ms render |

**Memory Usage:**
- Without: 1000 items = ~5MB DOM
- With: 20 visible items = ~100KB DOM (50x reduction)

## Implementation Details

### Fixed Item Heights

For optimal performance, items have fixed heights:

```typescript
const ORGANISATION_ITEM_HEIGHT = 56; // px
const PROJECT_ITEM_HEIGHT = 48; // px

<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={ORGANISATION_ITEM_HEIGHT}
  width="100%"
>
  {renderItem}
</FixedSizeList>
```

### Search Integration

Virtualization works seamlessly with debounced search:

```typescript
const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

// Filter happens before virtualization
const filteredItems = useMemo(
  () => items.filter((item) => matchesSearch(item, debouncedSearch)),
  [items, debouncedSearch]
);

// Virtualize filtered results
<FixedSizeList itemCount={filteredItems.length}>
  {({ index }) => <Item data={filteredItems[index]} />}
</FixedSizeList>
```

### Keyboard Navigation

Virtualization maintains keyboard accessibility:

```typescript
function OrganisationListItem({
  organisation,
  style,
  isHighlighted,
}: OrganisationListItemProps) {
  return (
    <button
      style={style}
      onClick={() => handleSelect(organisation)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSelect(organisation);
        }
      }}
      aria-selected={isHighlighted}
      role="option"
    >
      {organisation.name}
    </button>
  );
}
```

### Scroll to Selected Item

When opening picker, scroll to current selection:

```typescript
const listRef = useRef<FixedSizeList>(null);

useEffect(() => {
  if (isOpen && context.organisation) {
    const index = organisations.findIndex(
      (org) => org.id === context.organisation!.id
    );

    if (index !== -1) {
      listRef.current?.scrollToItem(index, 'center');
    }
  }
}, [isOpen, context.organisation, organisations]);

<FixedSizeList ref={listRef} {...props}>
  {renderItem}
</FixedSizeList>
```

## Consequences

### Positive

- **Excellent performance**: Constant-time rendering regardless of list size
- **Smooth scrolling**: 60fps even with 10,000+ items
- **Low memory**: Only visible items in DOM
- **Small bundle**: Only 6KB added
- **Accessible**: Works with keyboard and screen readers
- **Battle-tested**: Used by major applications

### Negative

- **Fixed heights**: Items must have consistent height (acceptable trade-off)
- **External dependency**: Adds `react-window` as dependency
- **CSS complexity**: Absolute positioning requires careful styling
- **Scroll position**: Lost when list changes (mitigated with `scrollToItem`)

### Mitigations

**Variable Heights (Future):**

If needed, can switch to `VariableSizeList`:

```typescript
import { VariableSizeList } from 'react-window';

<VariableSizeList
  height={400}
  itemCount={items.length}
  itemSize={(index) => calculateItemHeight(items[index])}
  width="100%"
>
  {renderItem}
</VariableSizeList>
```

**Scroll Position Preservation:**

```typescript
const listRef = useRef<FixedSizeList>(null);
const scrollOffsetRef = useRef(0);

// Save scroll position
const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
  scrollOffsetRef.current = scrollOffset;
};

// Restore after re-render
useEffect(() => {
  if (listRef.current && scrollOffsetRef.current > 0) {
    listRef.current.scrollTo(scrollOffsetRef.current);
  }
}, [filteredItems]);

<FixedSizeList
  ref={listRef}
  onScroll={handleScroll}
  {...props}
>
  {renderItem}
</FixedSizeList>
```

**Custom Pickers Without Virtualization:**

Users building custom pickers can opt out:

```tsx
// Without virtualization (small lists)
function SimpleOrganisationPicker() {
  const { organisations } = useContextSwitcher();

  return (
    <ul>
      {organisations.map((org) => (
        <li key={org.id}>{org.name}</li>
      ))}
    </ul>
  );
}
```

## Alternatives Considered

### 1. react-virtualized

**Rejected because:**
- Much larger bundle (~30KB vs ~6KB)
- More complex API
- `react-window` is the spiritual successor with lessons learned
- Brian Vaughn (author) recommends `react-window` for new projects

### 2. @tanstack/react-virtual

**Rejected because:**
- Newer, less battle-tested
- Slightly larger bundle (~8KB)
- More complex API (hooks-based, requires more setup)
- `react-window` is simpler and sufficient for our needs

### 3. Custom Virtualization

**Rejected because:**
- Would take significant development time
- Hard to get right (edge cases, accessibility, performance)
- Reinventing the wheel
- Adds maintenance burden

### 4. Infinite Scroll + Pagination

**Rejected because:**
- Doesn't solve initial load performance
- Requires backend pagination support
- Worse UX (can't Cmd+F search, can't jump to item)
- Still needs virtualization for large result sets

### 5. No Virtualization

**Rejected because:**
- Unacceptable performance with 1000+ items
- High memory usage
- Poor user experience
- Doesn't scale for enterprise use cases

## Related ADRs

- [ADR-002: State Management](./002-state-management.md) - How filtered lists are managed
- [ADR-004: API Integration](./004-api-integration.md) - How data is fetched

## References

- [react-window Documentation](https://react-window.vercel.app/)
- [react-window GitHub](https://github.com/bvaughn/react-window)
- [Why I Wrote react-window - Brian Vaughn](https://medium.com/@bvaughn/react-window-a-new-approach-to-virtual-scrolling-2d444ccb1a01)
- [List Virtualization - Web.dev](https://web.dev/virtualize-long-lists-react-window/)
