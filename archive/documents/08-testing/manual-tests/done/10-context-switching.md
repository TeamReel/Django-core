# Context Switching - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Multi-tenancy context switcher UI
- **Time**: 6-8 minuten
- **Prerequisites**: Multiple organizations/projects, user access to multiple contexts
- **Test Data**: User with access to 2+ organizations, multiple projects per org

## 🚀 Quick Access
- **Context Switcher**: Usually in top navigation or sidebar
- **Keyboard**: Ctrl/Cmd+K (if implemented)
- **Test URL**: Any page that shows contextual data

## 📋 Visual Test Scenarios

### Scenario 1: Context Switcher Visibility
**Steps**:
1. Login to demo shell
2. Locate context switcher component
3. Check current context display
4. Verify switcher is accessible

**Expected Results**:
- ✅ Context switcher clearly visible in navigation
- ✅ Current organization/project clearly indicated
- ✅ Switcher button/dropdown is recognizable
- ✅ Hover/focus states provide visual feedback

**Pass/Fail**:
- [ ] Pass: Context switcher is prominent and clear
- [ ] Fail: Hard to find or unclear current context

### Scenario 2: Organization Context Switching
**Steps**:
1. Open context switcher
2. View available organizations
3. Select different organization
4. Verify context change takes effect

**Expected Results**:
- ✅ Dropdown/modal shows all accessible organizations
- ✅ Organizations display with clear names/descriptions
- ✅ Current organization is highlighted/selected
- ✅ Switching triggers immediate context update

**Pass/Fail**:
- [ ] Pass: Smooth organization switching
- [ ] Fail: Switching fails or shows wrong organizations

### Scenario 3: Project Context Switching
**Steps**:
1. Within an organization, access project switcher
2. View available projects for current org
3. Switch between different projects
4. Check project-specific data filtering

**Expected Results**:
- ✅ Projects filtered by current organization
- ✅ Project list shows relevant project information
- ✅ Project switching updates data views
- ✅ Breadcrumb/context indicator updates

**Pass/Fail**:
- [ ] Pass: Project switching works within organization context
- [ ] Fail: Project data not filtered or switching broken

### Scenario 4: Hierarchical Context Display
**Steps**:
1. Check how Organization → Project hierarchy is displayed
2. Test navigation between hierarchy levels
3. Verify context breadcrumbs/indicators
4. Check context persistence across page navigation

**Expected Results**:
- ✅ Clear hierarchy: Organization > Project structure
- ✅ Breadcrumbs or indicators show full context path
- ✅ Context persists when navigating between pages
- ✅ Easy to understand current location in hierarchy

**Pass/Fail**:
- [ ] Pass: Clear hierarchical context display
- [ ] Fail: Confusing hierarchy or context loss

### Scenario 5: Search and Filtering
**Steps**:
1. If context switcher has search, test it
2. Search for organization/project by name
3. Test filtering by recent/favorites (if available)
4. Check performance with many contexts

**Expected Results**:
- ✅ Search filters contexts as you type
- ✅ 3+ character minimum or immediate search works
- ✅ Recent/favorites help with quick access
- ✅ Performance remains smooth with large lists

**Pass/Fail**:
- [ ] Pass: Search and filtering work efficiently
- [ ] Fail: Poor search performance or no filtering
- [ ] N/A: Search not implemented

### Scenario 6: Keyboard Shortcuts
**Steps**:
1. Test Ctrl/Cmd+K shortcut (if implemented)
2. Use arrow keys to navigate context options
3. Use Enter to select context
4. Test Escape to close switcher

**Expected Results**:
- ✅ Keyboard shortcut opens context switcher
- ✅ Arrow keys navigate through options
- ✅ Enter selects highlighted option
- ✅ Escape closes without changing context

**Pass/Fail**:
- [ ] Pass: Full keyboard accessibility
- [ ] Fail: Keyboard navigation broken or missing
- [ ] N/A: Keyboard shortcuts not implemented

### Scenario 7: Data Isolation Verification
**Steps**:
1. Note data in current context (files, projects, etc.)
2. Switch to different organization context
3. Verify data changes to match new context
4. Switch back and confirm original data returns

**Expected Results**:
- ✅ Data completely changes when switching contexts
- ✅ No data bleeding between different organizations
- ✅ Context-specific navigation/features update
- ✅ Original context data restored when switching back

**Pass/Fail**:
- [ ] Pass: Perfect data isolation between contexts
- [ ] Fail: Data leakage or context confusion

## 🐛 Troubleshooting

### Context Switcher Not Visible
- **Check**: User has access to multiple organizations/projects
- **Check**: Context switcher component is rendered
- **Check**: CSS/styling is not hiding the component
- **Check**: User permissions allow context switching

### Context Switch Fails
- **Check**: API endpoints for organization/project switching
- **Check**: Authentication headers include context information
- **Check**: Backend properly handles context switching requests
- **Check**: Frontend state management updates context

### Data Not Filtering
- **Check**: API queries include organization/project filters
- **Check**: Multi-tenancy middleware is working
- **Check**: Database queries respect context boundaries
- **Check**: Frontend requests send context headers

### Performance Issues
- **Check**: Context list is paginated for large datasets
- **Check**: Search/filtering is debounced appropriately
- **Check**: Context data is cached when possible
- **Check**: No unnecessary API calls during switching

## ✅ Success Criteria

Context switching test succesvol als:
- Context switcher is easily discoverable and usable
- Organization and project switching work smoothly
- Data isolation is perfect (no cross-context leakage)
- Context hierarchy is clear and navigable
- Performance remains good with multiple contexts
- Keyboard accessibility works (if implemented)
- Context persistence works across navigation

**Status**: 🟡 TODO - Ready to Test
