import { createContext, useContext, useState, useId } from 'react';
import { tabsContainer } from './Tabs.css';

interface TabsContextValue {
  selectedId: string;
  setSelectedId: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
}

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onChange,
  orientation = 'horizontal',
  children,
  className,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
  const baseId = useId();

  const selectedId = controlledValue ?? uncontrolledValue;
  const setSelectedId = (id: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(id);
    }
    onChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ selectedId, setSelectedId, orientation, baseId }}>
      <div className={`${tabsContainer} ${className ?? ''}`}>{children}</div>
    </TabsContext.Provider>
  );
}
