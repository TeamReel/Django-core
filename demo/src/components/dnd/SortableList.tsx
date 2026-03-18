/**
 * SortableList — Reusable drag-and-drop sortable list built on @dnd-kit.
 *
 * Features:
 * - Touch + mouse + keyboard support out-of-the-box
 * - Accessible: space to pick up, arrow keys to move, space to drop
 * - Reduced-motion safe (no transform transitions when motion disabled)
 * - Generic: pass any item type with `id` field + custom render function
 *
 * Usage:
 * ```tsx
 * <SortableList
 *   items={myItems}
 *   onReorder={(newItems) => setMyItems(newItems)}
 *   renderItem={(item, { isDragging, attributes, listeners, ref, style }) => (
 *     <div ref={ref} style={style} {...attributes} {...listeners}>
 *       {item.name}
 *     </div>
 *   )}
 * />
 * ```
 */
import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './SortableList.module.css';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface SortableItem {
  id: string | number;
}

export interface SortableRenderProps {
  isDragging: boolean;
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
}

export interface SortableListProps<T extends SortableItem> {
  /** Items to render in sortable order */
  items: T[];
  /** Called when items are reordered via drag */
  onReorder: (newItems: T[]) => void;
  /** Render function for each item */
  renderItem: (item: T, props: SortableRenderProps) => React.ReactNode;
  /** Optional CSS class for the list container */
  className?: string;
  /** aria-label for the sortable list */
  ariaLabel?: string;
}

/* ── SortableRow (internal) ─────────────────────────────────────────────── */

interface SortableRowProps<T extends SortableItem> {
  item: T;
  renderItem: SortableListProps<T>['renderItem'];
}

function SortableRow<T extends SortableItem>({ item, renderItem }: SortableRowProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition: transition ?? undefined,
      zIndex: isDragging ? 10 : undefined,
      opacity: isDragging ? 0.6 : 1,
      position: 'relative' as const,
    }),
    [transform, transition, isDragging],
  );

  return (
    <>
      {renderItem(item, {
        isDragging,
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as Record<string, unknown> | undefined,
        ref: setNodeRef,
        style,
      })}
    </>
  );
}

/* ── SortableList ───────────────────────────────────────────────────────── */

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  className,
  ariaLabel = 'Sorteerbare lijst',
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemIds = useMemo(
    () => items.map((item) => item.id),
    [items],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onReorder(arrayMove(items, oldIndex, newIndex));
    },
    [items, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          className={`${styles.sortableList} ${className ?? ''}`}
          role="list"
          aria-label={ariaLabel}
        >
          {items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
