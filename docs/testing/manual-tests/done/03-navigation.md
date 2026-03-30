# Navigation & Sidebar - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Sidebar navigation, menu states, responsive behavior
- **Time**: 5-7 minuten
- **Prerequisites**: Demo shell running
- **Test Data**: All navigation sections and menu items

## 🚀 Quick Access
- **Test Area**: Left sidebar in demo shell
- **All pages**: Navigation should be consistent across all routes

## 📋 Visual Test Scenarios

### Scenario 1: Navigation Stability
**Steps**:
1. Load any demo shell page
2. Observe sidebar for 10 seconds
3. Navigate between different pages
4. Check for any flickering or jumping

**Expected Results**:
- ✅ Sidebar is completely stable (NO FLICKERING)
- ✅ Menu items don't shift or jump
- ✅ Smooth transitions between states
- ✅ Consistent positioning across page loads

**CRITICAL**: If flickering occurs, this is a high-priority bug!

**Pass/Fail**:
- [ ] Pass: Perfect stability, no flickering
- [ ] Fail: Any flickering or jumping behavior

### Scenario 2: Menu Group Expansion
**Steps**:
1. Click each main menu group header
2. Test expand/collapse functionality
3. Check state persistence
4. Navigate to different page and return

**Expected Results**:
- ✅ Groups expand/collapse smoothly
- ✅ Expand/collapse icons update correctly (▾/▸)
- ✅ Expanded state remembered in localStorage
- ✅ Active page auto-expands containing group

**Visual Checklist**:
- [ ] Identity & Context group
- [ ] Configuration group
- [ ] Platform Status group
- [ ] Frontend Resources group
- [ ] Documentation group

**Pass/Fail**:
- [ ] Pass: All groups expand/collapse properly
- [ ] Fail: Broken expansion or state persistence

### Scenario 3: Active State Indication
**Steps**:
1. Navigate to different pages via sidebar links
2. Check active state highlighting
3. Test nested route highlighting
4. Verify active state persists on refresh

**Expected Results**:
- ✅ Current page highlighted with background color
- ✅ Active text has appropriate weight/color
- ✅ Only one item active at a time
- ✅ Active state persists on page refresh

**Pass/Fail**:
- [ ] Pass: Clear, accurate active state indication
- [ ] Fail: Missing, incorrect, or multiple active states

### Scenario 4: Responsive Navigation
**Steps**:
1. Test on desktop width (>1024px)
2. Resize to tablet width (768-1024px)
3. Resize to mobile width (<768px)
4. Check navigation accessibility

**Expected Results**:
- ✅ Sidebar remains functional at all screen sizes
- ✅ Content doesn't overlap with navigation
- ✅ Menu remains accessible on smaller screens
- ✅ Touch-friendly on mobile devices

**Pass/Fail**:
- [ ] Pass: Navigation works well at all screen sizes
- [ ] Fail: Broken layout or unusable on smaller screens

### Scenario 5: Keyboard Navigation
**Steps**:
1. Use Tab key to navigate through menu items
2. Use Enter key to activate menu items
3. Use Arrow keys (if supported)
4. Check focus indicators

**Expected Results**:
- ✅ All menu items reachable via keyboard
- ✅ Clear focus indicators visible
- ✅ Logical tab order through menu
- ✅ Enter key activates menu items

**Pass/Fail**:
- [ ] Pass: Full keyboard accessibility
- [ ] Fail: Missing focus indicators or broken keyboard nav

### Scenario 6: Menu Content Accuracy
**Steps**:
1. Verify all expected menu items are present
2. Check links go to correct pages
3. Verify icons display correctly
4. Check for any broken or missing links

**Expected Menu Structure**:
```
Identity & Context
- 🏢 Organisations
- 🔐 Permissions
- 👤 Profile

Configuration
- ⚙️ Preferences
- 📋 Audit Log
- 🚩 Feature Flags
- 💳 Credits

Platform Status
- ❤️ Health Status
- 📜 Constitution
- 🔒 Security
- 📊 Observability
- 🔌 API Docs

Frontend Resources
- 🎨 Design System
- 🔐 Auth Flows
- 🔀 Context Switcher
- 📁 File Management Demo
- 📊 Resources
- 📄 Templates
- 🎭 Theme Showcase
- 🔗 Integration Patterns

Documentation
- 📚 Docs
- ✓ Tasks
- 🔔 Notifications
- 🚀 Deployment
```

**Pass/Fail**:
- [ ] Pass: All menu items present and functional
- [ ] Fail: Missing items, broken links, or incorrect icons

## 🐛 Troubleshooting

### Flickering Issues
- Check Sidebar.tsx for navGroups definition location
- Verify useEffect dependencies don't include navGroups
- Look for infinite re-render patterns
- Check React DevTools for unnecessary renders

### Active State Issues
- Verify location.pathname matching logic
- Check Link component href attributes
- Ensure route paths match menu item paths

### Responsive Issues
- Check CSS for proper breakpoints
- Verify sidebar width doesn't cause overflow
- Test touch interactions on actual mobile devices

## ✅ Success Criteria

Navigation test is succesvol als:
- Perfect stability (absolutely no flickering)
- All menu groups expand/collapse correctly
- Active state indication works accurately
- Responsive behavior is excellent at all screen sizes
- Full keyboard accessibility
- All menu items link to correct pages

**CRITICAL**: Navigation flickering is a show-stopper bug that must be fixed immediately.

**Next Step**: If navigation is stable, proceed to test individual feature pages.
