import React from 'react';
import { List } from 'react-window';

// Type for the props passed to each row component by react-window
interface RowProps {
  index: number;
  style: React.CSSProperties;
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
  // Row renderer for react-window
  // Each row is wrapped in a div with absolute positioning from react-window
  const Row = ({ index, style }: RowProps): React.ReactElement => (
    <div style={style}>{renderItem(items[index], index)}</div>
  );

  // Cast List to any to work around react-window type definition issues
  const ListComponent = List as any;

  return (
    <ListComponent
      className={className}
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </ListComponent>
  );
}

// Export without forwardRef for now - react-window List doesn't support standard ref forwarding
export const VirtualizedList = VirtualizedListInner as <T>(
  props: VirtualizedListProps<T>
) => React.ReactElement;
