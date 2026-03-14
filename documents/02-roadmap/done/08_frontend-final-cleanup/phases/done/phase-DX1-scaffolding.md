# DX1 — Scaffolding CLI

**Status:** 🔲 Todo
**Effort:** 4 uur
**Scope:** 3 generators voor nieuwe features

---

## Doel

CLI commands om nieuwe pages, modals, en hooks te scaffolden met de juiste structuur en boilerplate.

## Commands

### 1. `npm run generate:page <PageName>`

Maakt:
```
src/pages/<PageName>/
  index.tsx                 # Page component
  <PageName>.module.css     # Styles
  use<PageName>Data.ts      # Data hook
  <PageName>.test.tsx       # Test file
```

Template:
```typescript
// index.tsx
import styles from './<PageName>.module.css';
import { use<PageName>Data } from './use<PageName>Data';

export function <PageName>Page() {
  const { data, isLoading, error } = use<PageName>Data();

  if (isLoading) return <PageSkeleton />;
  if (error) return <PageError error={error} />;

  return (
    <div className={styles.container}>
      <PageHeader title="<PageName>" />
      {/* Page content */}
    </div>
  );
}
```

### 2. `npm run generate:modal <ModalName>`

Maakt:
```
src/components/<ModalName>Modal/
  index.tsx                 # Modal component
  <ModalName>Modal.module.css
  use<ModalName>Modal.ts    # Modal state hook
  <ModalName>Modal.test.tsx
```

Template:
```typescript
// index.tsx
import { Modal } from '@/components/ui';
import styles from './<ModalName>Modal.module.css';

interface <ModalName>ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function <ModalName>Modal({ isOpen, onClose }: <ModalName>ModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="<ModalName>">
      <div className={styles.content}>
        {/* Modal content */}
      </div>
    </Modal>
  );
}
```

### 3. `npm run generate:hook <hookName>`

Maakt:
```
src/hooks/use<HookName>/
  index.ts                  # Main hook
  fetchers.ts               # API calls
  transformers.ts           # Data transforms
  types.ts                  # Local types
  use<HookName>.test.ts     # Test file
```

Template:
```typescript
// index.ts
import { useFetch<HookName> } from './fetchers';
import { transform<HookName>Data } from './transformers';

export function use<HookName>() {
  const { data, isLoading, error, refetch } = useFetch<HookName>();
  const transformed = transform<HookName>Data(data);

  return {
    data: transformed,
    isLoading,
    error,
    refetch,
  };
}
```

## Implementation

```typescript
// scripts/generate.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const templates = {
  page: { /* templates */ },
  modal: { /* templates */ },
  hook: { /* templates */ },
};

function generate(type: 'page' | 'modal' | 'hook', name: string) {
  const template = templates[type];
  const targetDir = getTargetDir(type, name);

  fs.mkdirSync(targetDir, { recursive: true });

  for (const [filename, content] of Object.entries(template)) {
    const filePath = path.join(targetDir, filename.replace('<Name>', name));
    const fileContent = content.replace(/<Name>/g, name);
    fs.writeFileSync(filePath, fileContent);
  }

  console.log(`Created ${type}: ${name}`);
}
```

## package.json scripts

```json
{
  "scripts": {
    "generate:page": "tsx scripts/generate.ts page",
    "generate:modal": "tsx scripts/generate.ts modal",
    "generate:hook": "tsx scripts/generate.ts hook"
  }
}
```

## Verificatie

- [ ] `npm run generate:page TestPage` creates correct structure
- [ ] `npm run generate:modal TestModal` creates correct structure
- [ ] `npm run generate:hook testHook` creates correct structure
- [ ] Generated code compiles
- [ ] Generated tests pass

## Acceptatiecriteria

Na DX1:
- 3 working generators
- Documentation in README
- Team can use for new features
