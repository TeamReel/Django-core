import React from 'react';
import { List as ReactWindowList, RowComponentProps } from 'react-window';

// Props passed to each row via rowProps
interface RowProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

export interface VirtualizedListProps<T> {
  /**
   * Array of items to render
   */
  items: T[];

  /**
   * Function to render each item
   * @param item - The item to render
   * @param index - The index of the item in the array
   * @returns React node to render
   */
  renderItem: (item: T, index: number) => React.ReactNode;

  /**
   * Height of each item in pixels
   * @default 48
   */
  itemHeight?: number;

  /**
   * Total height of the virtualized list container
   * @default 400
   */
  height?: number;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * VirtualizedList component that renders only visible items from a large list.
 * Uses react-window for efficient virtualization.
 *
 * Benefits:
 * - Renders only visible items (+ small buffer)
 * - Handles 1000+ items with smooth 60fps scrolling
 * - Significantly reduces DOM nodes and memory usage
 *
 * Usage:
 * ```tsx
 * <VirtualizedList
 *   items={organisations}
 *   renderItem={(org) => <div>{org.name}</div>}
 *   itemHeight={48}
 *   height={400}
 * />
 * ```
 *
 * Requirements:
 * - NFR-014: Virtualization for lists >50 items
 * - Performance: <100ms render for 1000 items
 */
function VirtualizedListInner<T>({
  items,
  renderItem,
  itemHeight = 48,
  height = 400,
  className,
}: VirtualizedListProps<T>): React.ReactElement {
  // Row renderer component for react-window v2
  // Receives items and renderItem via rowProps
  const RowComponent = React.useCallback(
    ({ index, style, items: itemsList, renderItem: render }: RowComponentProps<RowProps<T>>) => {
      const item = itemsList[index];

      // Safety check for out-of-bounds access
      if (!item) {
        return <div style={style} />;
      }

      return <div style={style}>{render(item, index)}</div>;
    },
    []
  );

  // Stable rowProps to prevent unnecessary re-renders
  const rowProps = React.useMemo<RowProps<T>>(
    () => ({ items, renderItem }),
    [items, renderItem]
  );

  return (
    <ReactWindowList
      style={{ height }}
      rowCount={items.length}
      rowHeight={itemHeight}
      rowComponent={RowComponent}
      rowProps={rowProps}
      className={className}
    />
  );
}

// Export without forwardRef for now - react-window List doesn't support standard ref forwarding
export const VirtualizedList = VirtualizedListInner as <T>(
  props: VirtualizedListProps<T>
) => React.ReactElement;
