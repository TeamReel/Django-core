import { useTabsContext } from './Tabs';
import { tabPanel } from './Tabs.css';

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { selectedId, baseId } = useTabsContext();
  const isSelected = selectedId === value;

  const panelId = `${baseId}-panel-${value}`;
  const tabId = `${baseId}-tab-${value}`;

  if (!isSelected) return null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className={`${tabPanel} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
