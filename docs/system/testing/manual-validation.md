# 🧪 Manual Validation Checklist - Modules 001-031
**Date**: 2025-12-14
**Validator**: Brian
**Demo Shell**: http://localhost:3003

---

## ✅ Module Group 1: Auth & Identity (B05 + F02)

### Test 1: Login Flow
- [ ] Navigate to http://localhost:3003
- [ ] Click "Login" or navigate to login page
- [ ] Enter credentials: admin@example.com / admin123
- [ ] Click "Login"
- **Expected**: Redirect to dashboard, see user email in header

### Test 2: Session Persistence
- [ ] After login, refresh page (F5)
- **Expected**: Still logged in, no redirect to login page

### Test 3: Logout Flow
- [ ] Click "Logout" button in header/menu
- **Expected**: Redirect to login, session cleared

---

## 🏢 Module Group 2: Multi-Tenancy (B06 + B07 + F03)

### Test 4: View Organisations
- [ ] Login if needed
- [ ] Navigate to "Organisations" page or open org switcher
- **Expected**: See list of organisations (at least "Test Org")

### Test 5: Switch Organisation Context
- [ ] Open organisation switcher (dropdown/modal)
- [ ] Select different organisation
- **Expected**: UI updates, context indicator shows new org

### Test 6: View Projects
- [ ] Navigate to "Projects" page
- **Expected**: See list of projects (may be empty or show test projects)

### Test 7: Switch Project Context
- [ ] If project switcher exists, select a project
- **Expected**: UI updates, context indicator shows project

---

## 🔐 Module Group 3: Permissions (B08)

### Test 8: Permissions Status Page
- [ ] Navigate to "Status" → "Permissions" (or /status/permissions)
- **Expected**: See hierarchical permission structure:
  - Global permissions
  - Organisation-level permissions
  - Project-level permissions

### Test 9: Context-Based Permissions
- [ ] Switch organisation context
- [ ] Check permissions status page again
- **Expected**: Permissions reflect current organisation context

---

## 🩺 Module Group 4: Health & Observability (B18 + F10)

### Test 10: Health Status Page
- [ ] Navigate to "Status" → "Health" (or /status/health)
- **Expected**: See system health indicators:
  - ✅ Database: healthy
  - ✅ Cache: healthy (or N/A)
  - Overall status: "operational"

---

## 🔒 Module Group 5: Security (B03)

### Test 11: CSRF Protection
- [ ] Open browser DevTools → Network tab
- [ ] Perform login or logout
- [ ] Check request headers
- **Expected**: `X-CSRFToken` header present in POST requests

### Test 12: Unauthenticated Access
- [ ] Logout completely
- [ ] Try to navigate to /status/permissions or /organisations
- **Expected**: Redirect to login page or see "Unauthorized" message

---

## 🎨 Module Group 6: Design System (F01)

### Test 13: UI Components Render
- [ ] Browse through pages
- [ ] Check that buttons, inputs, cards render consistently
- **Expected**: No broken styling, consistent design tokens

---

## 📋 Completion Summary

**Total Tests**: 13
**Passed**: ___
**Failed**: ___

### Issues Found:
1.
2.
3.

### Notes:
-
-

---

## 🚀 Quick Smoke Test (3 minutes)

If you're in a hurry, just test these critical flows:

1. ✅ **Login** → see dashboard
2. ✅ **View orgs** → see at least 1 organisation
3. ✅ **View projects** → page loads
4. ✅ **Health check** → all systems operational
5. ✅ **Logout** → redirect to login

If these 5 work, **95% of the platform is functional**.
