import { useTabsContext } from './Tabs';
import { tab, tabSelected } from './Tabs.css';

export interface TabProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, disabled = false, className }: TabProps) {
  const { selectedId, setSelectedId, baseId } = useTabsContext();
  const isSelected = selectedId === value;

  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  return (
    <button
      id={tabId}
      role="tab"
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setSelectedId(value)}
      className={`${tab} ${isSelected ? tabSelected : ''} ${className ?? ''}`}
      type="button"
    >
      {children}
    </button>
  );
}
