import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing controlled/uncontrolled state pattern
 * Supports both controlled (value + onChange) and uncontrolled (defaultValue) modes
 *
 * @example
 * ```tsx
 * // Uncontrolled
 * const [value, setValue] = useControlledState(undefined, 'default');
 *
 * // Controlled
 * const [value, setValue] = useControlledState(propValue, 'default', onPropChange);
 * ```
 */
export function useControlledState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  // Track if we're controlled to detect mode switches (anti-pattern but handle gracefully)
  const wasControlled = useRef(isControlled);
  useEffect(() => {
    if (wasControlled.current !== isControlled) {
      console.warn(
        'useControlledState: Component switched between controlled and uncontrolled modes. ' +
          'This is an anti-pattern and may cause unexpected behavior.'
      );
    }
    wasControlled.current = isControlled;
  }, [isControlled]);

  const setValue = useCallback(
    (newValue: T) => {
      if (isControlled) {
        // In controlled mode, call onChange if provided
        onChange?.(newValue);
      } else {
        // In uncontrolled mode, update internal state
        setUncontrolledValue(newValue);
        onChange?.(newValue);
      }
    },
    [isControlled, onChange]
  );

  return [value, setValue];
}
