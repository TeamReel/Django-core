/**
 * useFormFields — Lightweight form field state management.
 *
 * Groups related form fields into a single state object to reduce
 * the number of individual useState calls in form components.
 *
 * @example
 * const { fields, setField, reset } = useFormFields({
 *   email: '',
 *   password: '',
 *   confirmPassword: '',
 * });
 *
 * // In JSX:
 * <input value={fields.email} onChange={e => setField('email', e.target.value)} />
 * <input value={fields.password} onChange={e => setField('password', e.target.value)} />
 */
import { useState, useCallback } from 'react';

export interface UseFormFieldsReturn<T extends Record<string, unknown>> {
  /** Current field values */
  fields: T;
  /** Update a single field */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Reset all fields to initial values */
  reset: () => void;
  /** Replace all fields at once (e.g. when loading data from API) */
  setFields: (values: Partial<T>) => void;
}

export function useFormFields<T extends Record<string, unknown>>(
  initialValues: T,
): UseFormFieldsReturn<T> {
  const [fields, setFields_] = useState<T>(initialValues);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFields_(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setFields_(initialValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: always resets to initial mount values
  }, []);

  const setFields = useCallback((values: Partial<T>) => {
    setFields_(prev => ({ ...prev, ...values }));
  }, []);

  return { fields, setField, reset, setFields };
}
