# Constitution Dashboard - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Constitution engine rules and compliance monitoring
- **Time**: 5-7 minuten
- **Prerequisites**: Demo shell running, constitution engine configured
- **Test Data**: Constitution rules and violations from backend

## 🚀 Quick Access
- **Constitution Page**: http://localhost:3000/constitution
- **Navigation**: Sidebar → Platform Status → "📜 Constitution"
- **API**: http://localhost:8000/api/constitution/rules/

## 📋 Visual Test Scenarios

### Scenario 1: Constitution Dashboard Load
**Steps**:
1. Navigate to Constitution page
2. Check that dashboard loads
3. Review overall compliance status
4. Verify rule categories display

**Expected Results**:
- ✅ Page loads within 2 seconds
- ✅ Overall compliance status visible (e.g., "2 violations")
- ✅ Rule categories displayed with counts
- ✅ Active/total rules shown per category
- ✅ Visual indicators for compliance (green) and violations (red/yellow)

**Pass/Fail**:
- [ ] Pass: Dashboard displays compliance overview
- [ ] Fail: Dashboard empty or shows errors

### Scenario 2: Rule Categories Display
**Steps**:
1. Locate rule categories section
2. Review category breakdown
3. Check rule counts per category
4. Verify category status indicators

**Expected Results**:
- ✅ Categories listed (e.g., Security, Data Protection, API)
- ✅ Each category shows total rule count
- ✅ Active rules count displayed
- ✅ Violation count per category (if any)
- ✅ Visual differentiation between compliant and non-compliant categories

**Pass/Fail**:
- [ ] Pass: Rule categories display clearly
- [ ] Fail: Categories missing or counts incorrect

### Scenario 3: Rule List Display
**Steps**:
1. Locate rules table or list
2. Review rules displayed
3. Check rule information completeness
4. Verify rule status indicators

**Expected Results**:
- ✅ Rules displayed in table or list format
- ✅ Each rule shows: name, category, active status, violation count
- ✅ Active rules indicated (checkmark or badge)
- ✅ Rules with violations highlighted
- ✅ Rules sorted by category or violation count

**Pass/Fail**:
- [ ] Pass: Rule list is comprehensive and clear
- [ ] Fail: Rules missing or information incomplete

### Scenario 4: Violation Details
**Steps**:
1. Locate a rule with violations (violation_count > 0)
2. Click on rule to view violation details (if supported)
3. Review violation information
4. Check violation timestamps and descriptions

**Expected Results**:
- ✅ Violations listed for selected rule
- ✅ Each violation shows: timestamp, description, severity
- ✅ Violation location/context indicated (file, module, etc.)
- ✅ Violation count matches rule summary
- ✅ Recent violations shown first

**Pass/Fail**:
- [ ] Pass: Violation details are accessible and informative
- [ ] Fail: Violations not displayed or incomplete
- [ ] N/A: Detail view not implemented (summary-only)

### Scenario 5: Rule Status and Activation
**Steps**:
1. Check rule active/inactive status display
2. Verify inactive rules are visually distinct
3. Review active rule enforcement indication

**Expected Results**:
- ✅ Active rules clearly marked (green badge, checkmark)
- ✅ Inactive rules grayed out or marked
- ✅ Active rule count matches dashboard summary
- ✅ Rule enforcement status clear
- ✅ No confusion between active/inactive rules

**Pass/Fail**:
- [ ] Pass: Rule status is clear and accurate
- [ ] Fail: Status unclear or incorrect

### Scenario 6: Compliance Trend (If Implemented)
**Steps**:
1. Check for compliance trend chart or history
2. Review violation count over time
3. Verify trend direction (improving/declining)

**Expected Results**:
- ✅ Compliance trend chart displays
- ✅ X-axis shows time period
- ✅ Y-axis shows violation count
- ✅ Trend line indicates compliance direction
- ✅ Chart is responsive and readable

**Pass/Fail**:
- [ ] Pass: Compliance trend provides useful insight
- [ ] Fail: Trend chart broken or missing data
- [ ] N/A: Trend chart not implemented (current state only)

## 🐛 Troubleshooting

### Constitution Data Not Loading
- **Check**: API endpoint `/api/constitution/rules/` returns 200 or 404 (demo)
- **Check**: Constitution engine is configured
- **Check**: Mock data fallback works (demo mode)
- **Check**: No JavaScript errors in console

### Violation Count Incorrect
- **Check**: Violation count aggregation logic
- **Check**: Only active rules included in counts
- **Check**: Violations not double-counted
- **Check**: Violation timestamps within expected range

### Rules Not Displaying
- **Check**: Constitution rules exist in database or mock data
- **Check**: Rules have required fields (name, category, active)
- **Check**: API returns rules in expected format
- **Check**: Frontend parsing of rule data correct

## ✅ Success Criteria

Constitution test succesvol als:
- Dashboard provides clear compliance overview
- Rule categories display with accurate counts
- All rules listed with status and violation info
- Violations are accessible and detailed (if implemented)
- Active/inactive rules clearly differentiated
- Compliance trend visible (if implemented)
- Visual design makes compliance status immediately clear
- No missing or incorrect data

**Status**: 🟡 TODO - Ready to Test
