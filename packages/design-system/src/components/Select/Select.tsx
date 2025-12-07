import { useState, useEffect, useId } from 'react';
import {
  useFloating,
  autoUpdate,
  flip,
  shift,
  size,
  offset,
} from '@floating-ui/react';
import {
  selectContainer,
  selectButton,
  selectDropdown,
} from './Select.css';
import { SelectOption } from './SelectOption';

export interface SelectOptionType {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOptionType[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const activeDescendantId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const selectedOption = options.find((opt) => opt.value === value);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(availableHeight, 300)}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev + 1;
            return next >= options.length ? 0 : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? options.length - 1 : next;
          });
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(options.length - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeIndex >= 0 && !options[activeIndex]?.disabled) {
            onChange(options[activeIndex].value);
            setIsOpen(false);
            (refs.reference.current as HTMLElement | null)?.focus();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          (refs.reference.current as HTMLElement | null)?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, options, onChange, refs.reference]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const refElement = refs.reference.current as HTMLElement | null;
      const floatElement = refs.floating.current as HTMLElement | null;
      if (
        !refElement?.contains(e.target as Node) &&
        !floatElement?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, refs.reference, refs.floating]);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    (refs.reference.current as HTMLElement | null)?.focus();
  };

  return (
    <div className={`${selectContainer} ${className ?? ''}`}>
      <button
        ref={(node) => refs.setReference(node)}
        type="button"
        className={selectButton}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabel ? undefined : listboxId}
        aria-label={ariaLabel}
      >
        {selectedOption?.label ?? placeholder}
        <span aria-hidden="true">▼</span>
      </button>

      {isOpen && (
        <div
          ref={(node) => refs.setFloating(node)}
          className={selectDropdown}
          style={floatingStyles}
          role="listbox"
          id={listboxId}
          aria-activedescendant={activeDescendantId}
        >
          {options.map((option, index) => (
            <SelectOption
              key={option.value}
              option={option}
              isActive={index === activeIndex}
              isSelected={option.value === value}
              onClick={() => handleOptionClick(option.value)}
              id={`${listboxId}-option-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
