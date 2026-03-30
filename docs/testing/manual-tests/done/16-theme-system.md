# Theme System - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Theme switching, light/dark mode, brand variants
- **Time**: 8-10 minuten
- **Prerequisites**: Theme system implemented, demo shell running
- **Test Data**: Different theme options, brand configurations

## 🚀 Quick Access
- **Theme Showcase**: http://localhost:3000/theme
- **Navigation**: Sidebar → Frontend Resources → "🎭 Theme Showcase"
- **Theme Toggle**: Look for theme switcher in navigation/settings

## 📋 Visual Test Scenarios

### Scenario 1: Theme Toggle Accessibility
**Steps**:
1. Locate theme toggle/switcher in demo shell
2. Check current theme indication
3. Test theme toggle functionality
4. Verify toggle is accessible via keyboard

**Expected Results**:
- ✅ Theme toggle clearly visible in navigation
- ✅ Current theme state clearly indicated (light/dark icon)
- ✅ Toggle responds immediately to clicks
- ✅ Keyboard accessible (Tab + Enter/Space)

**Pass/Fail**:
- [ ] Pass: Theme toggle is prominent and accessible
- [ ] Fail: Hard to find, unclear state, or broken functionality

### Scenario 2: Light/Dark Mode Switching
**Steps**:
1. Start in light mode (or current default)
2. Switch to dark mode via toggle
3. Observe transition and final state
4. Switch back to light mode

**Expected Results**:
- ✅ Smooth transition between themes (< 300ms)
- ✅ All components adapt to new theme
- ✅ No flash of incorrect colors during transition
- ✅ Text remains readable in both themes

**Visual Checklist**:
- [ ] Navigation/sidebar adapts correctly
- [ ] Content areas use appropriate background colors
- [ ] Buttons and interactive elements adapt
- [ ] Text contrast remains sufficient in both modes

**Pass/Fail**:
- [ ] Pass: Seamless light/dark mode switching
- [ ] Fail: Broken transitions, poor contrast, or incomplete theming

### Scenario 3: Theme Persistence
**Steps**:
1. Switch to dark mode (or non-default theme)
2. Refresh the page
3. Navigate to different pages
4. Close and reopen browser

**Expected Results**:
- ✅ Theme preference survives page refresh
- ✅ Theme consistent across all pages in demo shell
- ✅ Theme persists across browser sessions (if configured)
- ✅ No theme flashing during page loads

**Pass/Fail**:
- [ ] Pass: Theme preference reliably persisted
- [ ] Fail: Theme resets or inconsistent across pages

### Scenario 4: Component Theme Consistency
**Steps**:
1. Visit theme showcase page (if available)
2. Review all components in current theme
3. Switch themes and check component adaptation
4. Test interactive component states (hover, focus, active)

**Expected Results**:
- ✅ All components follow theme design tokens
- ✅ Interactive states work in both light and dark themes
- ✅ Icons and graphics adapt to theme colors
- ✅ No components appear broken or inconsistent

**Pass/Fail**:
- [ ] Pass: Complete component theme consistency
- [ ] Fail: Some components don't adapt or look broken

### Scenario 5: Brand Variants (if implemented)
**Steps**:
1. Test different brand themes/variants
2. Check brand-specific colors and styling
3. Verify brand themes work with light/dark modes
4. Test brand switching functionality

**Expected Results**:
- ✅ Brand variants provide distinct visual identity
- ✅ Brand colors override default theme appropriately
- ✅ Brand themes work in both light and dark modes
- ✅ Brand switching updates throughout the interface

**Pass/Fail**:
- [ ] Pass: Brand variants work correctly
- [ ] Fail: Brand theming broken or inconsistent
- [ ] N/A: Brand variants not implemented

### Scenario 6: Accessibility Compliance
**Steps**:
1. Check color contrast in both light and dark themes
2. Test with high contrast mode (if supported)
3. Verify theme works with reduced motion preferences
4. Check focus indicators in both themes

**Expected Results**:
- ✅ Color contrast meets WCAG 2.1 AA standards (4.5:1 for normal text)
- ✅ High contrast mode provides enhanced accessibility
- ✅ Animations respect reduced motion preferences
- ✅ Focus indicators clearly visible in both themes

**Pass/Fail**:
- [ ] Pass: Full accessibility compliance in all themes
- [ ] Fail: Accessibility issues in any theme variant

### Scenario 7: Performance Impact
**Steps**:
1. Monitor page performance during theme switching
2. Check for layout shifts during transitions
3. Test theme switching speed
4. Verify no memory leaks with repeated switching

**Expected Results**:
- ✅ Theme switching completes under 300ms
- ✅ No layout shifts or content jumps
- ✅ CSS variables update smoothly
- ✅ No performance degradation with repeated switching

**Pass/Fail**:
- [ ] Pass: Excellent theme switching performance
- [ ] Fail: Slow switching or performance issues

### Scenario 8: System Theme Detection (if implemented)
**Steps**:
1. Change system theme (OS dark/light mode)
2. Check if demo shell detects and adapts
3. Verify manual override still works
4. Test initial theme detection on first visit

**Expected Results**:
- ✅ Demo shell detects system theme preference
- ✅ Automatic adaptation to system theme changes
- ✅ Manual theme choice overrides system detection
- ✅ Appropriate fallback if system preference unavailable

**Pass/Fail**:
- [ ] Pass: Smart system theme integration
- [ ] Fail: System theme detection broken
- [ ] N/A: System theme detection not implemented

## 🐛 Troubleshooting

### Theme Toggle Not Working
- **Check**: Theme system JavaScript is loaded
- **Check**: CSS custom properties are supported
- **Check**: Theme toggle event listeners are attached
- **Check**: Browser console for JavaScript errors

### Incomplete Theme Switching
- **Check**: All components use design tokens/CSS variables
- **Check**: No hardcoded colors in component CSS
- **Check**: Theme contracts are properly implemented
- **Check**: CSS selectors target theme data attributes

### Theme Persistence Issues
- **Check**: localStorage is available and working
- **Check**: Theme storage interface is functioning
- **Check**: Server-side theme detection (if implemented)
- **Check**: Cookie settings for cross-session persistence

### Performance Problems
- **Check**: CSS-in-JS runtime overhead
- **Check**: Bundle size of theme system
- **Check**: Number of CSS custom properties
- **Check**: DOM updates during theme switching

## ✅ Success Criteria

Theme system test succesvol als:
- Light/dark mode switching works flawlessly with smooth transitions
- Theme preferences persist reliably across sessions and pages
- All components consistently adapt to theme changes
- Accessibility standards met in all theme variants
- Performance remains excellent during theme switching
- Brand variants (if implemented) provide distinct visual identity
- System theme detection works automatically (if implemented)

**Status**: 🟡 TODO - Ready to Test
