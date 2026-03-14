/**
 * formReducer — Generic reducer + setter factory for form-state hooks.
 *
 * Replaces patterns of 20-50 individual `useState` calls with a single
 * `useReducer` while preserving backward-compatible setter functions.
 *
 * @example
 * ```ts
 * const [state, dispatch] = useReducer(formReducer<MyState>, initialState);
 * const setters = useMemo(() => makeSetters<MyState>(dispatch, [
 *   'name', 'email', 'loading', 'error',
 * ]), [dispatch]);
 * ```
 */
import type { Dispatch, SetStateAction } from 'react';

// ── Action types ─────────────────────────────────────────────────────────────

export type FormAction<S> =
  | { type: 'set'; field: keyof S; value: S[keyof S] }
  | { type: 'update'; field: keyof S; fn: (prev: S[keyof S]) => S[keyof S] }
  | { type: 'patch'; payload: Partial<S> };

// ── Reducer ──────────────────────────────────────────────────────────────────

export function formReducer<S>(state: S, action: FormAction<S>): S {
  switch (action.type) {
    case 'set':
      return state[action.field] === action.value
        ? state
        : { ...state, [action.field]: action.value };
    case 'update': {
      const next = action.fn(state[action.field]);
      return state[action.field] === next
        ? state
        : { ...state, [action.field]: next };
    }
    case 'patch':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ── Setter factory ───────────────────────────────────────────────────────────

/**
 * Create a single backward-compatible setter for a field.
 * Supports both direct values and function updaters: `setFoo(val)` or `setFoo(prev => next)`.
 * The returned function has stable identity (safe for deps arrays).
 */
export function makeSetter<S, K extends keyof S>(
  dispatch: Dispatch<FormAction<S>>,
  field: K,
): Dispatch<SetStateAction<S[K]>> {
  return ((v: SetStateAction<S[K]>) => {
    if (typeof v === 'function') {
      dispatch({ type: 'update', field, fn: v as (prev: S[keyof S]) => S[keyof S] });
    } else {
      dispatch({ type: 'set', field, value: v as S[keyof S] });
    }
  }) as Dispatch<SetStateAction<S[K]>>;
}

/**
 * Batch-create setters for multiple fields at once.
 *
 * @returns Object keyed by setter name (`set` + PascalCase field), e.g. `{ setLoading, setError }`.
 *
 * Call inside `useMemo(() => makeSetters(dispatch, fields), [dispatch])` — since
 * `dispatch` from `useReducer` is referentially stable, setters are created once.
 */
export function makeSetters<S>(
  dispatch: Dispatch<FormAction<S>>,
  fields: (keyof S)[],
): Record<string, Dispatch<SetStateAction<S[keyof S]>>> {
  const result: Record<string, Dispatch<SetStateAction<S[keyof S]>>> = {};
  for (const field of fields) {
    const name = `set${String(field).charAt(0).toUpperCase()}${String(field).slice(1)}`;
    result[name] = makeSetter(dispatch, field) as Dispatch<SetStateAction<S[keyof S]>>;
  }
  return result;
}
