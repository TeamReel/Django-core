import { useEffect, useRef } from 'react';
import { useTabsContext } from './Tabs';
import { tabList, tabListHorizontal, tabListVertical } from './Tabs.css';

export interface TabListProps {
  children: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}

export function TabList({ children, 'aria-label': ariaLabel, className }: TabListProps) {
  const { orientation = 'horizontal' } = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!listRef.current) return;

      const tabs = Array.from(
        listRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
      );
      const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            e.preventDefault();
            nextIndex = currentIndex + 1 >= tabs.length ? 0 : currentIndex + 1;
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal') {
            e.preventDefault();
            nextIndex = currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical') {
            e.preventDefault();
            nextIndex = currentIndex + 1 >= tabs.length ? 0 : currentIndex + 1;
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical') {
            e.preventDefault();
            nextIndex = currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1;
          }
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    };

    const list = listRef.current;
    list?.addEventListener('keydown', handleKeyDown);
    return () => list?.removeEventListener('keydown', handleKeyDown);
  }, [orientation]);

  const orientationClass = orientation === 'vertical' ? tabListVertical : tabListHorizontal;

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={`${tabList} ${orientationClass} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
