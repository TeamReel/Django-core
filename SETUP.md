# F01 Frontend Design System - Setup Instructions

## ✅ Huidige Status (2025-12-06)

### Voltooide Werk
- ✅ **Specificatie fase**: spec.md, plan.md, tasks.md, analysis.md
- ✅ **WP01 Implementatie**: Complete package setup en tooling
  - Package structure in `packages/design-system/`
  - Alle configuratie files (TypeScript, Vite, ESLint, Prettier, Jest, Storybook)
  - README.md met documentatie
  - Placeholder exports voor theme system

### Git Status
- **Branch**: `022-frontend-design-system`
- **Worktree**: `.worktrees/022-frontend-design-system`
- **Laatste commit**: WP01 complete (voor review)
- **Files staged**: WP01 in `tasks/for_review/` lane

### Volgende Stappen
- **WP02**: Design Token System implementeren
- **WP03**: Theming Infrastructure
- **WP04**: Core Form Components
- etc. (zie tasks.md voor volledige lijst)

---

## 🚀 Setup op Andere Laptop

### Stap 1: Repository Clonen en Worktree Opzetten

```powershell
# Clone repository (als je dit nog niet hebt)
git clone https://github.com/your-org/django-core.git
cd django-core

# Checkout de feature branch via worktree
git worktree add .worktrees/022-frontend-design-system 022-frontend-design-system

# Ga naar de worktree
cd .worktrees/022-frontend-design-system
```

### Stap 2: Node.js Installeren (als nog niet geïnstalleerd)

**Optie A - Via winget (aanbevolen):**
```powershell
winget install OpenJS.NodeJS.LTS
```

**Optie B - Handmatig:**
1. Download van https://nodejs.org/ (LTS versie)
2. Installeer met default settings
3. **Herstart terminal**

**Verificatie:**
```powershell
node --version   # Moet v18+ of hoger zijn
npm --version    # Moet 9+ of hoger zijn
```

### Stap 3: pnpm Installeren

```powershell
npm install -g pnpm
pnpm --version   # Moet 8+ zijn
```

### Stap 4: Dependencies Installeren

```powershell
# Zorg dat je in de worktree root bent
cd "C:\pad\naar\django-core\.worktrees\022-frontend-design-system"

# Installeer alle dependencies
pnpm install
```

Dit installeert alle packages gedefinieerd in `packages/design-system/package.json`.

### Stap 5: Verificatie

Test of alles werkt:

```powershell
# TypeScript check
pnpm --filter design-system typecheck

# Linting
pnpm --filter design-system lint

# Tests (zal nog geen tests vinden, maar zou moeten starten)
pnpm --filter design-system test

# Build
pnpm --filter design-system build

# Storybook starten (voor visuele verificatie)
pnpm --filter design-system storybook
```

**Verwachte resultaten:**
- ✅ `typecheck`: Geen errors (placeholder code is type-safe)
- ✅ `lint`: Geen errors
- ✅ `test`: Jest draait (0 tests gevonden is OK)
- ✅ `build`: Produceert `packages/design-system/dist/` folder
- ✅ `storybook`: Opent op http://localhost:6006 (leeg, dat is OK)

---

## 📋 Verder Gaan met Implementatie

### Volgende Work Package: WP02 - Design Token System

**Status**: Klaar om te starten  
**Locatie**: `kitty-specs/022-frontend-design-system/tasks/planned/WP02-design-token-system.md`

**Commando om te starten:**
```powershell
# Zet shell PID
$SHELL_PID = $PID

# Move WP02 to doing (handmatig, of wacht op fix van Python script)
Move-Item "kitty-specs\022-frontend-design-system\tasks\planned\WP02-design-token-system.md" `
          "kitty-specs\022-frontend-design-system\tasks\doing\WP02-design-token-system.md"

# Start implementatie met GitHub Copilot
# Vraag: "Implement WP02 following the task prompt"
```

**Wat WP02 omvat:**
- T014-T025: Design token files (colors, typography, spacing, etc.)
- vanilla-extract theme contracts
- CSS custom property generation
- Type-safe token exports

### Alternatief: Gebruik Spec Kitty Command

Als je Spec Kitty verder wilt gebruiken:
```powershell
# In VS Code chat
/spec-kitty.implement
```

Dit zal automatisch:
1. WP02 naar doing lane verplaatsen
2. Metadata updaten
3. Implementatie starten volgens het prompt

---

## 🔧 Troubleshooting

### pnpm install faalt

**Symptoom**: Dependency resolution errors

**Fix**:
```powershell
# Clear cache
pnpm store prune

# Clean node_modules
Remove-Item -Recurse -Force node_modules, packages/*/node_modules

# Retry
pnpm install
```

### TypeScript errors na install

**Symptoom**: Cannot find module '@vanilla-extract/css'

**Fix**:
```powershell
# Re-install in design-system package
cd packages/design-system
pnpm install
```

### Storybook start niet

**Symptoom**: Port 6006 in use

**Fix**:
```powershell
# Gebruik andere port
pnpm --filter design-system storybook -- --port 6007
```

### ESLint errors over missing parser

**Symptoom**: "Cannot find module '@typescript-eslint/parser'"

**Fix**: Installeer dependencies opnieuw:
```powershell
pnpm install --force
```

---

## 📦 Package Structuur Overzicht

```
packages/design-system/
├── .storybook/              # Storybook config (WP01 ✅)
│   ├── main.ts
│   └── preview.ts
├── src/
│   ├── tokens/              # Design tokens (WP02 - TODO)
│   ├── theme/               # Theme system (WP03 - TODO)
│   │   └── index.ts         # Placeholder exports (WP01 ✅)
│   ├── components/          # UI components (WP04-WP08 - TODO)
│   ├── index.ts             # Main exports (WP01 ✅)
│   └── index.css            # Token CSS (WP02 - TODO)
├── tests/
│   └── setup.ts             # Test setup (WP01 ✅)
├── package.json             # Package config (WP01 ✅)
├── tsconfig.json            # TypeScript config (WP01 ✅)
├── vite.config.ts           # Build config (WP01 ✅)
├── jest.config.js           # Test config (WP01 ✅)
├── .eslintrc.cjs            # Lint config (WP01 ✅)
├── .prettierrc              # Format config (WP01 ✅)
└── README.md                # Documentation (WP01 ✅)
```

---

## 🎯 Quick Reference Commands

```powershell
# Development
pnpm --filter design-system dev          # Start dev server
pnpm --filter design-system storybook    # Start Storybook

# Quality Checks
pnpm --filter design-system lint         # Lint code
pnpm --filter design-system typecheck    # Type check
pnpm --filter design-system test         # Run tests
pnpm --filter design-system test:coverage # Coverage report

# Build
pnpm --filter design-system build        # Build package

# Formatting
pnpm --filter design-system format       # Format code
```

---

## 📚 Belangrijke Files om te Lezen

1. **Specificatie**: `kitty-specs/022-frontend-design-system/spec.md`
2. **Plan**: `kitty-specs/022-frontend-design-system/plan.md`
3. **Tasks**: `kitty-specs/022-frontend-design-system/tasks.md`
4. **Analysis**: `kitty-specs/022-frontend-design-system/analysis.md`
5. **Data Model**: `kitty-specs/022-frontend-design-system/data-model.md`
6. **Contracts**: `kitty-specs/022-frontend-design-system/contracts/components.md`
7. **Quickstart**: `kitty-specs/022-frontend-design-system/quickstart.md`

---

## ✅ Checklist voor Andere Laptop

- [ ] Repository gecloned
- [ ] Worktree opgezet voor `022-frontend-design-system`
- [ ] Node.js geïnstalleerd (v18+)
- [ ] pnpm geïnstalleerd (v8+)
- [ ] Dependencies geïnstalleerd (`pnpm install`)
- [ ] Verificatie commando's uitgevoerd
- [ ] Geen errors bij typecheck/lint/test/build
- [ ] Klaar om WP02 te starten! 🚀

---

**Laatste update**: 2025-12-06  
**Status**: WP01 complete, klaar voor WP02  
**Branch**: 022-frontend-design-system  
**Next**: Design Token System implementatie
