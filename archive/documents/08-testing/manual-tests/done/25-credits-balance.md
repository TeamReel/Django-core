# Credits & Balance - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Credits balance tracking and transaction history
- **Time**: 10-15 minutes
- **Prerequisites**: Demo shell running, backend seeded with credit transactions
- **Test Data**: 5 credit transactions per organisation (seeded via seed_credit_transactions command)

## 🚀 Quick Access
- **Credits Page**: http://localhost:3000/credits
- **Navigation**: Sidebar → Configuration → "💳 Credits"
- **API Endpoints**:
  - Balance: http://localhost:8000/api/v1/credits/
  - Transactions: http://localhost:8000/api/v1/transactions/

## ✅ Backend Seeding Completed
The following credit transactions have been seeded for all 5 football organisations:
- Initial credit allocation: +1000
- Credit usage - API calls: -250
- Credit top-up: +500
- Credit usage - Storage: -150
- Bonus credits: +300

**Net balance per org**: 1400 credits (1000 + 500 + 300 - 250 - 150)

## 📋 Visual Test Scenarios

### Scenario 1: Balance Tab - Credits Display
**Steps**:
1. Navigate to Credits page as **Superadmin** (Thomas Tuchel)
2. Select **Eredivisie** from organisation breadcrumb switcher
3. Verify **Balance** tab is active by default
4. Check that current balance displays

**Expected Results**:
- ✅ Current balance shows **1,400 credits** (or 1,200 if using existing data)
- ✅ Organisation name: **Eredivisie**
- ✅ Last updated timestamp visible
- ✅ No low balance warning (threshold is < 100)
- ✅ Breadcrumb shows org switcher dropdown for superadmin

**Pass/Fail**:
- [ ] Pass: Balance displays correctly with proper styling
- [ ] Fail: Balance missing or incorrect

---

### Scenario 2: Transactions Tab - History Display
**Steps**:
1. Still as **Superadmin**, on Credits page for **Eredivisie**
2. Click **Transactions** tab
3. Wait for transactions to load
4. Review transaction table

**Expected Results**:
- ✅ **5 rows** of credit transactions display
- ✅ Newest transaction first (Bonus credits +300)
- ✅ Table columns: Date, Type, Amount, Notes
- ✅ Positive amounts (+1000, +500, +300) show in **green** with "+" prefix
- ✅ Negative amounts (-250, -150) show in **red**
- ✅ Type column shows "adjustment" for all (credits are adjustments)
- ✅ Notes match seeded data (e.g., "Initial credit allocation", "Credit usage - API calls")

**Pass/Fail**:
- [ ] Pass: All 5 transactions display correctly
- [ ] Fail: Missing transactions or display errors

---

### Scenario 3: Test Controls - Visibility Rules
**Steps**:
1. As **Superadmin**, stay on Transactions tab for **Eredivisie**
2. Scroll down to bottom of page
3. Check for "🧪 Test controls (demo)" section

**Expected Results**:
- ✅ Test controls **ARE visible** (superadmin has access)
- ✅ Three buttons: **+500**, **-250**, **+1000**
- ✅ Footer text: "Creates real credit transactions via POST /api/v1/transactions/"

**Pass/Fail**:
- [ ] Pass: Test controls visible for superadmin
- [ ] Fail: Controls hidden or missing

---

### Scenario 4: Test Controls - Create Transaction (+500)
**Steps**:
1. As **Superadmin**, on Transactions tab for **Eredivisie**
2. Click **+500** button
3. Wait for toast notification
4. Check transaction table refreshes

**Expected Results**:
- ✅ Toast notification appears: "Successfully added +500 credits"
- ✅ Transaction table **refreshes automatically**
- ✅ **New row** appears at top: +500.00, "adjustment", "Demo test control +500"
- ✅ Switch to **Balance tab** → balance increased by 500 (now 1,900 or 1,700)

**Network Tab Verification**:
- ✅ POST `/api/v1/transactions/` with payload:
  - `amount: "500"`
  - `source_type: "adjustment"`
  - `organization: <eredivisie-id>`
- ✅ GET `/api/v1/transactions/?organization=...&source_type=adjustment` (refetch)
- ✅ GET `/api/v1/credits/?organisation_id=...` (balance refetch)

**Pass/Fail**:
- [ ] Pass: Transaction created, table + balance updated
- [ ] Fail: Error toast, no transaction, or balance not updated

---

### Scenario 5: Test Controls - Create Negative Transaction (-250)
**Steps**:
1. Still as **Superadmin**, on Transactions tab for **Eredivisie**
2. Click **-250** button
3. Wait for toast notification

**Expected Results**:
- ✅ Toast notification: "Successfully added -250 credits"
- ✅ New row appears: **-250.00** in **red**
- ✅ Notes: "Demo test control -250"
- ✅ Balance tab shows balance **decreased by 250**

**Pass/Fail**:
- [ ] Pass: Negative transaction works correctly
- [ ] Fail: Error or incorrect balance change

---

### Scenario 6: Context Switching - Different Organisations
**Steps**:
1. As **Superadmin**, use breadcrumb org switcher
2. Switch from **Eredivisie** to **Bundesliga**
3. Check Transactions tab

**Expected Results**:
- ✅ Transactions **refresh automatically** on org switch
- ✅ **Different set** of 5 credit transactions for Bundesliga
- ✅ Balance tab shows **Bundesliga's** balance (1,400 credits)
- ✅ Test controls remain visible (superadmin)
- ✅ Network tab shows GET `/api/v1/transactions/?organization=<bundesliga-id>&source_type=adjustment`

**Pass/Fail**:
- [ ] Pass: Org switching works, transactions change correctly
- [ ] Fail: Stale data, no refetch, or wrong transactions displayed

---

### Scenario 7: Org Admin - Test Controls Visibility
**Steps**:
1. Log out and log in as **Andre Onana** (Eredivisie member, non-admin)
2. Navigate to Credits page
3. Check Transactions tab

**Expected Results**:
- ✅ Credits page **is accessible** (not 403)
- ✅ Balance tab shows **Eredivisie** balance
- ✅ Transactions tab shows **Eredivisie** credit transactions
- ✅ Test controls **ARE visible** if Onana is an **org admin**
- ✅ Test controls **ARE HIDDEN** if Onana is a **coach/player** (not admin)

**Verification**:
- Check Onana's role in demo: if role = "admin" for Eredivisie, controls show
- If role = "coach" or "player", controls hidden

**Pass/Fail**:
- [ ] Pass: Visibility matches role correctly
- [ ] Fail: Admin sees no controls, or non-admin sees controls

---

### Scenario 8: Coach/Player - Read-Only Access
**Steps**:
1. Log in as **Coach** or **Player** for any org
2. Navigate to Credits page
3. Check both tabs

**Expected Results**:
- ✅ Credits page accessible (not 403)
- ✅ Balance tab displays correctly (read-only)
- ✅ Transactions tab displays correctly (read-only)
- ✅ Test controls **ARE HIDDEN** (non-admin)
- ✅ Breadcrumb does **NOT** have org switcher (locked to own org)
- ✅ Role badge shows "👤 ORG" (not "👑 ADMIN")

**Pass/Fail**:
- [ ] Pass: Read-only access works, no test controls
- [ ] Fail: 403 error, or test controls visible to non-admin

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
