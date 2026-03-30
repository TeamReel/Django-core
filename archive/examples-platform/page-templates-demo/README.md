# Page Templates Demo

This is a demonstration app showing all four page templates from `@django-core/page-templates`.

## Templates Demonstrated

### 1. Dashboard Template
- Analytics dashboard with widgets
- Filter bar with date range selection
- Responsive grid layout
- State controls to demo loading, error, empty, and permission denied states

### 2. List-Detail Template
- Projects browser with master-detail layout
- Search functionality
- Mobile-responsive (overlay on mobile, side-by-side on desktop)
- Selection state management

### 3. Wizard Template
- Multi-step onboarding flow
- Step indicator
- Navigation controls
- Form state management across steps

### 4. Settings Template
- User settings with sidebar navigation
- Multiple setting sections
- Form controls and preferences

## Running the Demo

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Key Features Demonstrated

- **State Management**: Both controlled and uncontrolled patterns
- **State Overrides**: Custom loading, error, empty, and permission denied states
- **Responsive Design**: Mobile-first layouts that adapt to screen size
- **Composition**: Integration with F01 (design system) and F06 (layouts)
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Project Structure

```
src/
├── App.tsx              # Main app with navigation
├── App.css              # App-level styles
├── main.tsx             # Entry point
├── index.css            # Global styles
└── pages/
    ├── DashboardDemo.tsx    # Dashboard template demo
    ├── ListDetailDemo.tsx   # List-Detail template demo
    ├── WizardDemo.tsx       # Wizard template demo
    └── SettingsDemo.tsx     # Settings template demo
```

## Learn More

- [Page Templates Documentation](../../packages/page-templates/README.md)
- [Storybook](../../packages/page-templates/.storybook)
- [API Reference](../../kitty-specs/029-reusable-page-templates/data-model.md)
