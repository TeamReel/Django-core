#!/usr/bin/env node

/**
 * Scaffolding CLI — generates pages, modals, and hooks
 *
 * Usage:
 *   node scripts/generate.mjs page  <PageName>
 *   node scripts/generate.mjs modal <ModalName>
 *   node scripts/generate.mjs hook  <hookName>
 *
 * Or via npm scripts:
 *   npm run generate:page  <PageName>
 *   npm run generate:modal <ModalName>
 *   npm run generate:hook  <hookName>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'src');

// ── helpers ─────────────────────────────────────────────

function pascal(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camel(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/** Strip trailing "Page"/"Modal" so names don't double up */
function baseName(str, suffix) {
  const re = new RegExp(`${suffix}$`, 'i');
  return str.replace(re, '') || str;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    console.error(`  ⏭  ${path.relative(SRC, filePath)} (already exists)`);
    return false;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓  ${path.relative(SRC, filePath)}`);
  return true;
}

// ── templates ───────────────────────────────────────────

function pageTemplates(Name) {
  const Base = baseName(Name, 'Page');
  const dir = path.join(SRC, 'pages', Name);

  const index = `\
import { PageHeader, PageContent } from '@django-core/page-templates';
import { use${Base}Data } from './use${Base}Data';

export default function ${Base}Page() {
  const { data, isLoading, error } = use${Base}Data();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <>
      <PageHeader title="${Base}" />
      <PageContent>
        {/* Page content */}
      </PageContent>
    </>
  );
}
`;

  const hook = `\
import { useState, useEffect } from 'react';

export function use${Base}Data() {
  const [data, setData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO: fetch data
    setIsLoading(false);
  }, []);

  return { data, isLoading, error };
}
`;

  const css = `\
/* ${Base}Page styles */
`;

  const test = `\
import { renderWithProviders } from '@/test';

vi.mock('./use${Base}Data', () => ({
  use${Base}Data: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  PageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { default: ${Base}Page } = await import('./index');

describe('${Base}Page', () => {
  it('renders without crashing', () => {
    renderWithProviders(<${Base}Page />);
  });
});
`;

  writeFile(path.join(dir, 'index.tsx'), index);
  writeFile(path.join(dir, `use${Base}Data.ts`), hook);
  writeFile(path.join(dir, `${Base}Page.module.css`), css);
  writeFile(path.join(dir, `${Base}Page.test.tsx`), test);
}

// ─────────────────────────────────────────────────────────

function modalTemplates(Name) {
  const Base = baseName(Name, 'Modal');
  const dir = path.join(SRC, 'components', `${Base}Modal`);

  const index = `\
import { useRef } from 'react';
import styles from './${Base}Modal.module.css';

interface ${Base}ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ${Base}Modal({ isOpen, onClose }: ${Base}ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} open className={styles.dialog}>
      <header className={styles.header}>
        <h2>${Base}</h2>
        <button onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className={styles.content}>
        {/* Modal content */}
      </div>
    </dialog>
  );
}
`;

  const hook = `\
import { useState, useCallback } from 'react';

export function use${Base}Modal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
`;

  const css = `\
/* ${Base}Modal styles */

.dialog {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--app-border);
}

.content {
  padding: 16px;
}
`;

  const test = `\
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { ${Base}Modal } from './index';

describe('${Base}Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <${Base}Modal isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('renders when open', () => {
    renderWithProviders(<${Base}Modal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('${Base}')).toBeInTheDocument();
  });
});
`;

  writeFile(path.join(dir, 'index.tsx'), index);
  writeFile(path.join(dir, `use${Base}Modal.ts`), hook);
  writeFile(path.join(dir, `${Base}Modal.module.css`), css);
  writeFile(path.join(dir, `${Base}Modal.test.tsx`), test);
}

// ─────────────────────────────────────────────────────────

function hookTemplates(rawName) {
  const Name = pascal(rawName);
  const name = camel(rawName);
  const dir = path.join(SRC, 'hooks', `use${Name}`);

  const index = `\
import { useFetch${Name} } from './fetchers';
import { transform${Name}Data } from './transformers';

export function use${Name}() {
  const { data, isLoading, error, refetch } = useFetch${Name}();
  const transformed = transform${Name}Data(data);

  return { data: transformed, isLoading, error, refetch };
}
`;

  const fetchers = `\
import { useState, useEffect, useCallback } from 'react';

export function useFetch${Name}() {
  const [data, setData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: replace with actual API call
      setData(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
`;

  const transformers = `\
export function transform${Name}Data(raw: unknown) {
  // TODO: transform API response
  return raw;
}
`;

  const types = `\
/** Types for use${Name} hook */

export interface ${Name}Data {
  // TODO: define shape
}
`;

  const test = `\
import { renderHook, waitFor } from '@testing-library/react';
import { use${Name} } from './index';

vi.mock('./fetchers', () => ({
  useFetch${Name}: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('./transformers', () => ({
  transform${Name}Data: (d: unknown) => d,
}));

describe('use${Name}', () => {
  it('returns data shape', () => {
    const { result } = renderHook(() => use${Name}());
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });
});
`;

  writeFile(path.join(dir, 'index.ts'), index);
  writeFile(path.join(dir, 'fetchers.ts'), fetchers);
  writeFile(path.join(dir, 'transformers.ts'), transformers);
  writeFile(path.join(dir, 'types.ts'), types);
  writeFile(path.join(dir, `use${Name}.test.ts`), test);
}

// ── main ────────────────────────────────────────────────

const [, , type, rawName] = process.argv;

if (!type || !rawName) {
  console.log(`
  Usage:
    node scripts/generate.mjs page  <PageName>
    node scripts/generate.mjs modal <ModalName>
    node scripts/generate.mjs hook  <hookName>
  `);
  process.exit(1);
}

const Name = pascal(rawName);

console.log(`\n  Generating ${type}: ${Name}\n`);

switch (type) {
  case 'page':
    pageTemplates(Name);
    break;
  case 'modal':
    modalTemplates(Name);
    break;
  case 'hook':
    hookTemplates(rawName);
    break;
  default:
    console.error(`  Unknown type "${type}". Use: page | modal | hook`);
    process.exit(1);
}

console.log('\n  Done!\n');
