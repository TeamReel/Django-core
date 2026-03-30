# Accessibility (A11y) - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Web accessibility compliance and usability
- **Time**: 20-25 minuten
- **Prerequisites**: Screen reader software (optional), keyboard-only testing
- **Test Data**: Various user scenarios (keyboard-only, screen reader, motor impairments)

## 🚀 Quick Access
- **Demo Shell**: http://localhost:3000
- **Accessibility Tools**: Browser extensions (axe, WAVE), built-in dev tools
- **Testing Tools**: Tab key, screen reader (NVDA/JAWS/VoiceOver)

## 📋 Visual Test Scenarios

### Scenario 1: Keyboard Navigation
**Steps**:
1. Start at demo shell homepage
2. Use only Tab key to navigate entire interface
3. Test Shift+Tab for reverse navigation
4. Use Enter/Space to activate elements

**Expected Results**:
- ✅ All interactive elements reachable via keyboard
- ✅ Logical tab order through interface
- ✅ Clear focus indicators on all elements
- ✅ No keyboard traps (can always navigate away)

**Pass/Fail**:
- [x] Pass: Complete keyboard accessibility
- [ ] Fail: Missing focus indicators or unreachable elements

### Scenario 2: Focus Management
**Steps**:
1. Open modals/dropdowns via keyboard
2. Check focus moves into opened elements
3. Test Escape key to close elements
4. Verify focus returns to trigger element

**Expected Results**:
- ✅ Focus automatically moves to opened modal/dropdown
- ✅ Focus trapped within modal while open
- ✅ Escape key closes modal/dropdown
- ✅ Focus returns to original trigger element

**Pass/Fail**:
- [x] Pass: Excellent focus management
- [ ] Fail: Focus lost or poor focus trapping

### Scenario 3: Screen Reader Testing (if available)
**Steps**:
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate through demo shell with screen reader
3. Test form completion with screen reader
4. Check image alt text and link descriptions

**Expected Results**:
- ✅ All content is announced clearly
- ✅ Form labels are properly associated
- ✅ Images have descriptive alt text
- ✅ Link text is descriptive ("Download file" vs "Click here")

**Pass/Fail**:
- [x] Pass: Screen reader can use entire interface
- [ ] Fail: Content not announced or confusing navigation
- [ ] N/A: Screen reader not available for testing

### Scenario 4: Color Contrast Testing
**Steps**:
1. Use browser dev tools accessibility panel
2. Check color contrast ratios
3. Test in both light and dark themes
4. Check interactive state contrast (hover, focus)

**Expected Results**:
- ✅ Normal text: minimum 4.5:1 contrast ratio
- ✅ Large text (18pt+): minimum 3:1 contrast ratio
- ✅ UI elements: minimum 3:1 contrast ratio
- ✅ Focus indicators clearly visible

**Pass/Fail**:
- [x] Pass: All contrast requirements met
- [ ] Fail: Contrast issues in any theme or state

### Scenario 5: Form Accessibility
**Steps**:
1. Navigate forms using only keyboard
2. Check label association with form fields
3. Test error message announcement
4. Verify required field indication

**Expected Results**:
- ✅ All form fields have proper labels
- ✅ Required fields clearly marked
- ✅ Error messages associated with fields
- ✅ Form instructions are clear and accessible

**Pass/Fail**:
- [x] Pass: Forms are fully accessible
- [ ] Fail: Missing labels or poor error handling

### Scenario 6: ARIA Implementation
**Steps**:
1. Check ARIA landmarks (main, navigation, etc.)
2. Test ARIA live regions for dynamic content
3. Verify ARIA labels on interactive elements
4. Check role attributes on custom components

**Expected Results**:
- ✅ Page has proper landmark structure
- ✅ Dynamic content changes announced
- ✅ Custom components have appropriate ARIA roles
- ✅ Button and link purposes are clear

**Pass/Fail**:
- [x] Pass: Proper ARIA implementation throughout
- [ ] Fail: Missing or incorrect ARIA attributes

### Scenario 7: Motor Impairment Considerations
**Steps**:
1. Test with large cursor/pointer simulation
2. Check minimum touch target sizes (44px)
3. Test drag-and-drop alternatives
4. Verify no time-based interactions

**Expected Results**:
- ✅ All interactive elements minimum 44px touch target
- ✅ Drag-and-drop has keyboard/click alternatives
- ✅ No automatic timeouts on important actions
- ✅ Click targets have adequate spacing

**Pass/Fail**:
- [x] Pass: Good motor accessibility support
- [ ] Fail: Small targets or motor-unfriendly interactions

### Scenario 8: Cognitive Accessibility
**Steps**:
1. Check interface complexity and clarity
2. Test error message clarity
3. Verify consistent navigation patterns
4. Check for clear instructions and help text

**Expected Results**:
- ✅ Interface is intuitive and not overwhelming
- ✅ Error messages are plain language
- ✅ Navigation is consistent across pages
- ✅ Complex tasks have clear instructions

**Pass/Fail**:
- [x] Pass: Interface supports cognitive accessibility
- [ ] Fail: Confusing interface or unclear instructions

### Scenario 9: Automated Accessibility Testing
**Steps**:
1. Run axe-core browser extension on demo pages
2. Use Lighthouse accessibility audit
3. Check browser dev tools accessibility panel
4. Test with WAVE web accessibility evaluator

**Expected Results**:
- ✅ No critical accessibility violations
- ✅ Lighthouse accessibility score > 95
- ✅ Automated tools find minimal issues
- ✅ Any found issues are documented for fixing

**Pass/Fail**:
- [x] Pass: Clean automated accessibility testing
- [ ] Fail: Multiple violations or poor automated scores

## 🐛 Troubleshooting

### Focus Indicators Missing
- **Check**: CSS doesn't remove outline without replacement
- **Check**: Custom focus styles are visible and contrast well
- **Check**: Focus styles work in both light and dark themes
- **Fix**: Add visible focus indicators to all interactive elements

### Screen Reader Issues
- **Check**: Semantic HTML is used (headings, lists, etc.)
- **Check**: ARIA labels are present where needed
- **Check**: Form labels are properly associated
- **Fix**: Add missing semantic markup and ARIA attributes

### Contrast Failures
- **Check**: Color combinations meet WCAG 2.1 AA standards
- **Check**: Text remains readable in all themes
- **Check**: Interactive states maintain contrast
- **Fix**: Adjust colors to meet contrast requirements

### Keyboard Navigation Problems
- **Check**: Tab order is logical
- **Check**: All interactive elements are focusable
- **Check**: No keyboard traps exist
- **Fix**: Add tabindex, improve focus management

## ✅ Success Criteria

Accessibility test succesvol als:
- Complete keyboard navigation without mouse
- Screen reader can access and understand all content
- Color contrast meets WCAG 2.1 AA standards
- Focus management works correctly in all interactions
- Forms are fully accessible with proper labels and error handling
- Automated accessibility tools show minimal issues
- Interface supports users with motor and cognitive impairments

**Status**: ✅ COMPLETED
