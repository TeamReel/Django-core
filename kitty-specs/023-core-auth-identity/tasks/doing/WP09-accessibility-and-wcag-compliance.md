---
work_package_id: "WP09"
subtasks:
  - "T100"
  - "T101"
  - "T102"
  - "T103"
  - "T104"
  - "T105"
  - "T106"
  - "T107"
  - "T108"
  - "T109"
  - "T110"
  - "T111"
  - "T112"
title: "Accessibility & WCAG 2.1 AA Compliance"
phase: "Phase 3 - Quality & Polish"
priority: "P2"
lane: "doing"
assignee: ""
agent: "claude-implementer"
shell_pid: "35160"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-08T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP09 – Accessibility & WCAG 2.1 AA Compliance

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[Empty initially. Reviewers will populate if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Ensure all auth components meet WCAG 2.1 AA standards: keyboard navigation, ARIA labels, focus management, screen reader support.

**Success Criteria**:
- [ ] All components pass automated accessibility tests (jest-axe, no violations)
- [ ] Keyboard navigation works correctly (Tab order, Enter to submit, Escape to cancel)
- [ ] Forms have proper <label> elements (via F01 Input)
- [ ] ARIA attributes added where needed (aria-invalid, aria-describedby for errors)
- [ ] Focus management on validation errors (focus first invalid field)
- [ ] Visible focus indicators (F01 focus styles applied)
- [ ] Screen reader testing passes (NVDA on Windows, VoiceOver on macOS)
- [ ] Color contrast meets AA standards (F01 tokens only)
- [ ] Skip links added if needed
- [ ] All tests pass

**Independent Test**: Run jest-axe tests → no violations. Manual keyboard navigation through all forms → all actions accessible. Screen reader testing → all labels, errors, success messages read aloud.

---

## Context & Constraints

**Prerequisites**:
- WP04-WP07 completed (all page and form components implemented)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/spec.md` - Accessibility requirements
- `kitty-specs/023-core-auth-identity/plan.md` - WCAG 2.1 AA compliance strategy
- `.kittify/memory/constitution.md` - Principle VII (UX)
- WCAG 2.1 AA Guidelines: https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa

**Architectural Decisions**:
- **Automated testing**: jest-axe for component tests
- **Manual testing**: Keyboard navigation + screen reader testing
- **F01 dependency**: Assume F01 components are accessible, but verify in auth context
- **Focus management**: Use React refs to focus first invalid field on validation error

**Constraints**:
- F01 components should already be accessible—verify, don't rebuild
- If F01 has gaps, file issues with F01 team, add workarounds in F02 if needed
- Color contrast: Use only F01 tokens (assumes AA compliance)
- Testing: Supplement automated tests with manual keyboard/screen reader testing

---

## Subtasks & Detailed Guidance

### Subtask T100 – Add jest-axe to Test Suite

**Purpose**: Enable automated accessibility testing.

**Steps**:
1. Install dependencies:
   ```bash
   pnpm add -D jest-axe @types/jest-axe
   ```
2. Create test helper `src/__tests__/helpers/axe.ts`:
   ```typescript
   import { configureAxe } from 'jest-axe';

   export const axe = configureAxe({
     rules: {
       // Customize rules if needed
       // e.g., disable specific rules for known F01 issues
     },
   });
   ```
3. Export helper for use in component tests

**Validation**:
- jest-axe installed and configured
- Helper available for import in tests

**Files Modified**:
- `package.json` (add dependencies)
- `src/__tests__/helpers/axe.ts` (new)

---

### Subtask T101 – Write Accessibility Tests for SignInPage

**Purpose**: Validate no accessibility violations in sign-in flow.

**Steps**:
1. Create `src/components/pages/__tests__/SignInPage.a11y.test.tsx`
2. Test cases:
   - No axe violations on default render
   - No axe violations with validation errors
   - Keyboard navigation: Tab through form, Enter submits
   - Focus visible on all interactive elements
3. Example test:
   ```typescript
   import { axe } from '@/__tests__/helpers/axe';
   import { render } from '@testing-library/react';
   import { SignInPage } from '../SignInPage';

   describe('SignInPage Accessibility', () => {
     it('has no axe violations', async () => {
       const { container } = render(<SignInPage />);
       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });

     it('has no axe violations with errors', async () => {
       // Mock error state in useSignIn
       const { container } = render(<SignInPage />);
       // Trigger validation error
       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });
   });
   ```

**Validation**:
- All tests pass
- No axe violations reported

**Files Modified**:
- `src/components/pages/__tests__/SignInPage.a11y.test.tsx` (new)

---

### Subtask T102 – Write Accessibility Tests for RequestPasswordResetPage

**Purpose**: Validate no violations in password reset request flow.

**Steps**:
1. Create `src/components/pages/__tests__/RequestPasswordResetPage.a11y.test.tsx`
2. Test cases similar to T101:
   - No axe violations on default render
   - No axe violations with success message
   - Keyboard navigation works

**Validation**:
- All tests pass

**Files Modified**:
- `src/components/pages/__tests__/RequestPasswordResetPage.a11y.test.tsx` (new)

---

### Subtask T103 – Write Accessibility Tests for ConfirmPasswordResetPage

**Purpose**: Validate no violations in password reset confirmation flow.

**Steps**:
1. Create `src/components/pages/__tests__/ConfirmPasswordResetPage.a11y.test.tsx`
2. Test cases:
   - No axe violations with valid token
   - No axe violations with invalid token error
   - Keyboard navigation works

**Validation**:
- All tests pass

**Files Modified**:
- `src/components/pages/__tests__/ConfirmPasswordResetPage.a11y.test.tsx` (new)

---

### Subtask T104 – Write Accessibility Tests for ProfilePage

**Purpose**: Validate no violations in profile management flow.

**Steps**:
1. Create `src/components/pages/__tests__/ProfilePage.a11y.test.tsx`
2. Test cases:
   - No axe violations on default render
   - No axe violations with success message
   - Keyboard navigation works

**Validation**:
- All tests pass

**Files Modified**:
- `src/components/pages/__tests__/ProfilePage.a11y.test.tsx` (new)

---

### Subtask T105 – Ensure All Forms Have Proper <label> Elements

**Purpose**: Verify F01 Input provides accessible labels.

**Steps**:
1. Audit all form components (SignInForm, RequestPasswordResetForm, ConfirmPasswordResetForm, ProfileForm)
2. Verify each Input has `label` prop set
3. Example (already implemented in WP04-WP07):
   ```typescript
   <Input
     label="Email" // ✅ Accessible label
     type="email"
     value={email}
     onChange={...}
   />
   ```
4. If F01 Input doesn't render <label> properly, file issue with F01 team

**Validation**:
- All inputs have associated <label> elements
- Labels are correctly associated with inputs (via `for`/`id` attributes)

---

### Subtask T106 – Add ARIA Attributes Where Needed

**Purpose**: Enhance screen reader support with ARIA attributes.

**Steps**:
1. Review F01 Input component—does it add `aria-invalid` and `aria-describedby` automatically?
2. If yes: No action needed (F01 handles it)
3. If no: Add ARIA attributes manually:
   ```typescript
   <Input
     label="Email"
     value={email}
     onChange={...}
     error={error}
     aria-invalid={!!error} // Manual if F01 doesn't handle
     aria-describedby={error ? 'email-error' : undefined}
   />
   {error && <span id="email-error">{error}</span>}
   ```
4. Verify ARIA attributes in jest-axe tests

**Validation**:
- Inputs with errors have `aria-invalid="true"`
- Error messages linked via `aria-describedby`

---

### Subtask T107 – Test Keyboard Navigation

**Purpose**: Verify all actions accessible via keyboard.

**Steps**:
1. Manual test checklist:
   - **Tab navigation**: Press Tab to move through form fields in logical order
   - **Enter to submit**: Press Enter in any field to submit form
   - **Escape to cancel**: Press Escape to close any modals or dialogs (if applicable)
   - **Space to activate**: Press Space on buttons to activate
2. Automated test (optional):
   ```typescript
   it('submits form on Enter key', () => {
     const { getByLabelText } = render(<SignInForm />);
     const passwordInput = getByLabelText('Password');

     fireEvent.change(passwordInput, { target: { value: 'password123' } });
     fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });

     // Verify form submitted
   });
   ```

**Validation**:
- All forms navigable via Tab
- Enter submits forms
- No keyboard traps (can Tab out of all elements)

---

### Subtask T108 – Ensure Focus Management

**Purpose**: Focus first invalid field on validation error.

**Steps**:
1. Update form components to focus first error field
2. Use React refs:
   ```typescript
   const emailInputRef = useRef<HTMLInputElement>(null);
   const passwordInputRef = useRef<HTMLInputElement>(null);

   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();

     const errors = validate();
     if (errors.email) {
       emailInputRef.current?.focus();
       return;
     }
     if (errors.password) {
       passwordInputRef.current?.focus();
       return;
     }

     // Proceed with submission
   };

   return (
     <form onSubmit={handleSubmit}>
       <Input ref={emailInputRef} label="Email" ... />
       <Input ref={passwordInputRef} label="Password" ... />
     </form>
   );
   ```
3. Test focus management:
   ```typescript
   it('focuses first invalid field on validation error', () => {
     const { getByLabelText, getByText } = render(<SignInForm />);

     fireEvent.click(getByText('Sign In')); // Submit empty form

     expect(document.activeElement).toBe(getByLabelText('Email'));
   });
   ```

**Validation**:
- First invalid field receives focus on validation error
- Screen reader announces error after focus

**Files Modified**:
- All form components (update with refs and focus logic)

---

### Subtask T109 – Add Visible Focus Indicators

**Purpose**: Ensure focus is clearly visible.

**Steps**:
1. Verify F01 components have visible focus styles
2. If yes: No action needed
3. If no: Add custom focus styles (not recommended—file issue with F01 instead)
4. Test manually: Tab through forms, verify focus outline visible

**Validation**:
- Focus outline visible on all interactive elements
- Outline meets WCAG contrast requirements (3:1 against background)

---

### Subtask T110 – Test with Screen Readers

**Purpose**: Validate screen reader support.

**Steps**:
1. **Windows + NVDA**:
   - Download NVDA: https://www.nvaccess.org/download/
   - Start NVDA, navigate to SignInPage
   - Verify: Form labels, error messages, success messages read aloud
2. **macOS + VoiceOver**:
   - Enable VoiceOver: Cmd+F5
   - Navigate to SignInPage
   - Verify: Form labels, error messages, success messages read aloud
3. Document findings in test report

**Validation**:
- All labels read aloud correctly
- Errors announced after focus on invalid field
- Success messages announced when displayed
- Form instructions (e.g., "Required") communicated

---

### Subtask T111 – Add Skip Links If Needed

**Purpose**: Allow keyboard users to skip navigation.

**Steps**:
1. Assess: Do auth pages have navigation header?
2. If yes: Add skip link:
   ```typescript
   <a href="#main-content" className={styles.skipLink}>
     Skip to main content
   </a>
   <nav>...</nav>
   <main id="main-content">...</main>
   ```
3. Style skip link (hidden until focused):
   ```css
   .skipLink {
     position: absolute;
     left: -9999px;
     z-index: 999;
   }
   .skipLink:focus {
     left: 0;
   }
   ```
4. If no navigation: Skip this subtask (not needed)

**Validation**:
- Skip link visible on focus
- Skip link navigates to main content

---

### Subtask T112 – Ensure Color Contrast Meets AA Standards

**Purpose**: Validate text readability.

**Steps**:
1. Verify all colors use F01 tokens
2. F01 should guarantee AA compliance—trust but verify
3. Manual test with color contrast checker:
   - Tool: https://webaim.org/resources/contrastchecker/
   - Check: Text on background, error text, button text
   - Threshold: 4.5:1 for normal text, 3:1 for large text (18pt+)
4. If contrast issues found: File issue with F01, use alternative tokens if available

**Validation**:
- All text meets 4.5:1 contrast ratio (AA standard)
- Large text meets 3:1 contrast ratio

---

## Parallel Execution Strategy

**Parallel Group 1** (automated tests):
- T101-T104 (jest-axe tests for all pages)

**Parallel Group 2** (manual testing):
- T107 (keyboard navigation)
- T110 (screen reader testing)
- T112 (color contrast)

**Sequential**:
- T100 (jest-axe setup) → T101-T104
- T105-T106 (labels and ARIA)
- T108 (focus management)
- T109 (focus indicators)
- T111 (skip links)

---

## Testing & Validation Checklist

**Automated Tests**:
- [ ] All jest-axe tests pass (T101-T104)
- [ ] Coverage for accessibility tests

**Manual Testing**:
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus visible on all elements
- [ ] Focus management on validation errors
- [ ] Screen reader testing (NVDA on Windows, VoiceOver on macOS)
- [ ] Color contrast meets AA standards

**Compliance**:
- [ ] No WCAG 2.1 AA violations
- [ ] All forms accessible via keyboard
- [ ] All content readable by screen readers

---

## Definition of Done

- [ ] All subtasks (T100-T112) completed
- [ ] All automated tests pass
- [ ] Manual testing checklist complete
- [ ] No accessibility violations
- [ ] Code reviewed
- [ ] Merged to feature branch

---

## Risk Mitigation

**Risk**: F01 component accessibility gaps
**Mitigation**: Verify F01 compliance, file issues if needed, add workarounds in F02 if critical

**Risk**: Automated tests miss manual issues
**Mitigation**: Supplement with manual keyboard and screen reader testing

**Risk**: Focus management complexity
**Mitigation**: Use React refs, test with keyboard-only navigation

**Risk**: Color contrast issues with custom styles
**Mitigation**: Use only F01 tokens, validate with contrast checker

---

## Notes for Implementer

- **F01 trust but verify**: Assume F01 is accessible, but test in auth context
- **Focus management**: Essential for good UX—don't skip T108
- **Screen reader testing**: Critical—automated tests can't catch everything
- **Color contrast**: Use only F01 tokens to guarantee compliance

**Common Pitfalls**:
- Skipping manual testing (automated tests aren't enough)
- Not testing with real screen readers (simulators aren't sufficient)
- Adding custom styles that break contrast (use F01 tokens only)
- Forgetting focus management on validation errors

---

## Constitutional Compliance

**Principle VII (UX)**:
- WCAG 2.1 AA compliance
- Keyboard accessibility
- Screen reader support
- Clear focus indicators

---

## Handoff to Next Work Package

**Output Artifacts**:
- jest-axe tests for all pages
- Focus management in all forms
- Accessibility test report (manual testing findings)

**Next WP (WP10)** can proceed in parallel—documentation and accessibility are independent.

---

**Prompt Version**: 1.0
**Last Updated**: 2025-12-08
**Maintainer**: F02 Implementation Team

## Activity Log

- 2025-12-09T09:10:42Z – claude-implementer – shell_pid=35160 – lane=doing – Started implementation of Accessibility & WCAG 2.1 AA Compliance
