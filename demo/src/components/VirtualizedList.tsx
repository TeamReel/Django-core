import React, { CSSProperties, ReactNode, ReactElement } from 'react';
import { List, type RowComponentProps } from 'react-window';

/**
 * VirtualizedList - A wrapper around react-window for easy list virtualization
 *
 * Use this component when rendering lists with 50+ items to improve performance.
 * For lists under 50 items, renders without virtualization for simplicity.
 *
 * @example Basic usage with fixed row height
 * ```tsx
 * <VirtualizedList
 *   items={notifications}
 *   height={400}
 *   itemHeight={72}
 *   renderItem={({ item, style }) => (
 *     <div style={style}>
 *       <NotificationItem notification={item} />
 *     </div>
 *   )}
 * />
 * ```
 */

export interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];

  /** Height of the list container in pixels */
  height: number;

  /** Fixed height of each item in pixels */
  itemHeight: number;

  /** Width of the list container. Defaults to '100%' */
  width?: number | string;

  /** Render function for each item */
  renderItem: (props: { item: T; index: number; style: CSSProperties }) => ReactNode;

  /** Custom className for the list container */
  className?: string;

  /** Number of items to render before/after visible area (default: 3) */
  overscanCount?: number;
}

/**
 * VirtualizedList - Optimized for large lists with consistent row height
 * Falls back to regular rendering for lists under 50 items.
 */
export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  width = '100%',
  renderItem,
  className,
  overscanCount = 3,
}: VirtualizedListProps<T>) {
  // For empty lists, render nothing
  if (items.length === 0) {
    return null;
  }

  // For small lists (<50 items), render without virtualization for simplicity
  if (items.length < 50) {
    return (
      <div className={className} style={{ height, width, overflow: 'auto' }}>
        {items.map((item, index) =>
          renderItem({
            item,
            index,
            style: { height: itemHeight },
          })
        )}
      </div>
    );
  }

  // React-window 2.x rowComponent API
  // Props are spread directly onto the row component, including custom rowProps
  const RowComponent = (
    props: RowComponentProps<{ items: T[]; renderItem: typeof renderItem }>
  ): ReactElement | null => {
    const { items: rowItems, renderItem: render, index, style } = props;
    const item = rowItems[index];
    return <>{render({ item, index, style })}</> as ReactElement;
  };

  return (
    <List
      className={className}
      defaultHeight={height}
      rowCount={items.length}
      rowHeight={itemHeight}
      overscanCount={overscanCount}
      rowComponent={RowComponent}
      rowProps={{ items, renderItem }}
    />
  );
}

/**
 * Utility hook for calculating list dimensions based on container
 */
export function useListDimensions(containerRef: React.RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  return dimensions;
}

export default VirtualizedList;
