import { selectOption, selectOptionActive, selectOptionSelected } from './Select.css';
import type { SelectOptionType } from './Select';

interface SelectOptionProps {
  option: SelectOptionType;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  id: string;
}

export function SelectOption({
  option,
  isActive,
  isSelected,
  onClick,
  id,
}: SelectOptionProps) {
  const classNames = [
    selectOption,
    isActive && selectOptionActive,
    isSelected && selectOptionSelected,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      aria-disabled={option.disabled}
      className={classNames}
      onClick={option.disabled ? undefined : onClick}
      onMouseEnter={() => {}}
    >
      {option.label}
      {isSelected && <span aria-hidden="true">✓</span>}
    </div>
  );
}
