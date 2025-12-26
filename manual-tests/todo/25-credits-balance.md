# Credits & Balance - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Credits balance tracking and transaction history
- **Time**: 6-8 minuten
- **Prerequisites**: Demo shell running, organisation context selected
- **Test Data**: Mock credit balance and transaction data

## 🚀 Quick Access
- **Credits Page**: http://localhost:3000/credits
- **Navigation**: Sidebar → Configuration → "💳 Credits"
- **API**: http://localhost:8000/api/v1/credits/

## 📋 Visual Test Scenarios

### Scenario 1: Credits Balance Display
**Steps**:
1. Navigate to Credits page
2. Check that current balance displays
3. Review balance information shown
4. Verify visual indicators for balance status

**Expected Results**:
- ✅ Current balance displayed prominently
- ✅ Monthly limit shown (if applicable)
- ✅ Used credits this month visible
- ✅ Remaining balance calculated correctly
- ✅ Low balance warning if balance < threshold (e.g., < 100)

**Pass/Fail**:
- [ ] Pass: Balance information displays clearly
- [ ] Fail: Balance missing or incorrect

### Scenario 2: Transaction History Display
**Steps**:
1. Locate transaction history section on Credits page
2. Check that recent transactions display
3. Review transaction details
4. Verify transaction types are distinguishable

**Expected Results**:
- ✅ Transactions display in reverse chronological order (newest first)
- ✅ Each transaction shows: date, amount, type (add/use/refund), reason
- ✅ Positive amounts (adds/refunds) use green/positive styling
- ✅ Negative amounts (usage) use red/negative styling
- ✅ Transaction list is paginated or shows last 30 days

**Pass/Fail**:
- [ ] Pass: Transaction history displays correctly
- [ ] Fail: No transactions or display errors

### Scenario 3: Low Balance Alert
**Steps**:
1. Navigate to Credits page
2. Check for low balance alert/warning
3. Verify alert shows when balance < 100 (or configured threshold)
4. Review alert message clarity

**Expected Results**:
- ✅ Alert displays when balance is low
- ✅ Alert clearly states balance is low
- ✅ Alert suggests action (e.g., "Add more credits")
- ✅ Alert styling is attention-grabbing (warning/danger color)
- ✅ No alert when balance is sufficient

**Pass/Fail**:
- [ ] Pass: Low balance alert works correctly
- [ ] Fail: Alert missing or shows incorrectly
- [ ] N/A: Demo data has sufficient balance (manually adjust to test)

### Scenario 4: Product-Specific Balance (MarketingHub)
**Steps**:
1. Locate product-specific balance section (e.g., MarketingHub)
2. Check that product balance displays
3. Verify product balance is separate from main balance
4. Review low balance alert for product

**Expected Results**:
- ✅ Product balance displays separately
- ✅ Product name clearly labeled (e.g., "MarketingHub Balance")
- ✅ Low balance alert if product balance < threshold
- ✅ Product balance updates independently

**Pass/Fail**:
- [ ] Pass: Product-specific balance works
- [ ] Fail: Product balance missing or incorrect
- [ ] N/A: Product-specific balance not implemented

### Scenario 5: Balance Chart/Visualization
**Steps**:
1. Check for balance trend chart on Credits page
2. Verify chart displays balance over time
3. Review chart interactivity (if applicable)

**Expected Results**:
- ✅ Chart displays balance trend over time
- ✅ Chart shows adds, usage, and balance line
- ✅ Chart is responsive to window size
- ✅ Tooltip shows details on hover (if implemented)
- ✅ Chart updates when date range changes (if filter exists)

**Pass/Fail**:
- [ ] Pass: Balance chart displays correctly
- [ ] Fail: Chart broken or missing data
- [ ] N/A: Chart not yet implemented (WP06 pending)

### Scenario 6: Organisation Context Filtering
**Steps**:
1. Switch to Organisation A via context switcher
2. Navigate to Credits page
3. Note balance and transactions
4. Switch to Organisation B
5. Verify balance and transactions change

**Expected Results**:
- ✅ Balance is specific to selected organisation
- ✅ Transactions filtered to selected organisation
- ✅ Switching context updates balance immediately
- ✅ No data leakage between organisations

**Pass/Fail**:
- [ ] Pass: Balance correctly filtered by organisation
- [ ] Fail: Balance doesn't change or shows wrong data

## 🐛 Troubleshooting

### Balance Not Displaying
- **Check**: API endpoint `/api/v1/credits/` returns 200 or 404 (demo mode)
- **Check**: Organisation context is selected
- **Check**: Mock data fallback works (demo mode)
- **Check**: No JavaScript errors in console

### Transactions Not Loading
- **Check**: API endpoint `/api/v1/credits/transactions/` returns data or 404
- **Check**: Mock transaction data is used in demo mode
- **Check**: Transaction list component renders correctly

### Balance Incorrect
- **Check**: Balance calculation logic (current = starting + adds - usage)
- **Check**: Transaction amounts have correct signs (+/-)
- **Check**: Organisation filter applied to transactions
- **Check**: Recent transactions included in calculation

## ✅ Success Criteria

Credits test succesvol als:
- Current balance displays accurately
- Transaction history shows all operations
- Low balance alerts work correctly
- Product-specific balances display (if applicable)
- Balance chart visualizes trends (if implemented)
- Organisation context correctly filters balance data
- No data leakage between organisations
- UI provides clear, actionable balance information

**Status**: 🟡 TODO - Ready to Test
