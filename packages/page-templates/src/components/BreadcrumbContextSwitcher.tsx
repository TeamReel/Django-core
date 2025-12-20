import { ReactNode, useState, useRef, useEffect } from 'react';

export interface BreadcrumbSwitcherOption {
  id: string;
  label: string;
  slug?: string;
}

export interface BreadcrumbContextSwitcherProps {
  /** Current segment label (what's shown when not in dropdown mode) */
  label: string;

  /** Currently selected option ID */
  currentId: string;

  /** Available options for this segment */
  options: BreadcrumbSwitcherOption[];

  /** Callback when an option is selected */
  onSelect: (option: BreadcrumbSwitcherOption) => void;

  /** Whether this segment is the current/active page */
  current?: boolean;

  /** Whether this segment should have a dropdown (false = plain text) */
  hasDropdown?: boolean;

  /** Icon to show before label (optional) */
  icon?: ReactNode;
}

/**
 * BreadcrumbContextSwitcher - Dropdown switcher for breadcrumb segments
 *
 * Replaces static breadcrumb text with context-switching dropdowns.
 * Used for organization, project, and user segments.
 *
 * @example
 * ```tsx
 * <BreadcrumbContextSwitcher
 *   label="Bundesliga"
 *   currentId="bundesliga"
 *   options={organisations}
 *   onSelect={(org) => switchToOrg(org)}
 *   hasDropdown={true}
 * />
 * ```
 */
export function BreadcrumbContextSwitcher({
  label,
  currentId,
  options,
  onSelect,
  current = false,
  hasDropdown = true,
  icon,
}: BreadcrumbContextSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (option: BreadcrumbSwitcherOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  // If no dropdown or is current page, render as plain text
  if (!hasDropdown || current) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: current ? '#1f2937' : '#6b7280',
          fontWeight: current ? 600 : 400,
        }}
      >
        {icon}
        {label}
      </span>
    );
  }

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: isOpen ? '#f3f4f6' : 'transparent',
          border: '1px solid transparent',
          borderRadius: '4px',
          color: '#6b7280',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }
        }}
        onMouseOut={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {icon}
        <span>{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M6 8L2 4h8z" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: '12px 16px',
                color: '#9ca3af',
                fontSize: '14px',
              }}
            >
              No options available
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                role="option"
                aria-selected={option.id === currentId}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: option.id === currentId ? '#eff6ff' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  textAlign: 'left',
                  color: option.id === currentId ? '#1976d2' : '#374151',
                  fontSize: '14px',
                  fontWeight: option.id === currentId ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  if (option.id !== currentId) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseOut={(e) => {
                  if (option.id !== currentId) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
