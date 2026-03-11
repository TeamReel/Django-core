import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useQueryParams } from './useQueryParams';

function wrapper(initialPath = '/') {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
}

describe('useQueryParams', () => {
  it('get returns null for absent key', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/'),
    });
    expect(result.current.get('missing')).toBeNull();
  });

  it('get returns value from URL', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?page=3'),
    });
    expect(result.current.get('page')).toBe('3');
  });

  it('get returns default value when key is absent', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/'),
    });
    expect(result.current.get('page', '1')).toBe('1');
  });

  it('getAll returns all params as object', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?a=1&b=2'),
    });
    expect(result.current.getAll()).toEqual({ a: '1', b: '2' });
  });

  it('has returns boolean', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?key=val'),
    });
    expect(result.current.has('key')).toBe(true);
    expect(result.current.has('missing')).toBe(false);
  });

  it('getNumber parses integers', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?count=42'),
    });
    expect(result.current.getNumber('count')).toBe(42);
  });

  it('getNumber returns default for NaN', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?count=abc'),
    });
    expect(result.current.getNumber('count', 0)).toBe(0);
  });

  it('getNumber returns null when absent and no default', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/'),
    });
    expect(result.current.getNumber('x')).toBeNull();
  });

  it('getBoolean parses "true" and "1"', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?a=true&b=1&c=yes&d=false'),
    });
    expect(result.current.getBoolean('a')).toBe(true);
    expect(result.current.getBoolean('b')).toBe(true);
    expect(result.current.getBoolean('c')).toBe(true);
    expect(result.current.getBoolean('d')).toBe(false);
  });

  it('getBoolean returns default when absent', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/'),
    });
    expect(result.current.getBoolean('flag', true)).toBe(true);
    expect(result.current.getBoolean('flag')).toBeNull();
  });

  it('set adds a parameter', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/'),
    });

    act(() => result.current.set('page', '5'));
    expect(result.current.get('page')).toBe('5');
  });

  it('set with null removes the parameter', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?page=3'),
    });

    act(() => result.current.set('page', null));
    expect(result.current.has('page')).toBe(false);
  });

  it('setMultiple updates several params at once', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/'),
    });

    act(() => result.current.setMultiple({ a: '1', b: '2', c: null }));
    expect(result.current.get('a')).toBe('1');
    expect(result.current.get('b')).toBe('2');
    expect(result.current.has('c')).toBe(false);
  });

  it('delete removes a parameter', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?page=3&sort=asc'),
    });

    act(() => result.current.delete('page'));
    expect(result.current.has('page')).toBe(false);
    expect(result.current.get('sort')).toBe('asc');
  });

  it('clear removes all parameters', () => {
    const { result } = renderHook(() => useQueryParams(), {
      wrapper: wrapper('/?a=1&b=2&c=3'),
    });

    act(() => result.current.clear());
    expect(result.current.getAll()).toEqual({});
  });
});
