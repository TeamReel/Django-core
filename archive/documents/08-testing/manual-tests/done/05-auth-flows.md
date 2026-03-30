# Authentication Flows - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Login/logout/registration flows
- **Time**: 8-10 minuten
- **Prerequisites**: Django backend running
- **Test Data**: Test user credentials, new user registration data

## 🚀 Quick Access
- **Login URL**: http://localhost:3000/auth/login
- **Demo Shell**: Should redirect to login if not authenticated
- **Backend Admin**: http://localhost:8000/admin

## 📋 Visual Test Scenarios

### Scenario 1: Login Flow
**Steps**:
1. Navigate to demo shell while logged out
2. Should redirect to login page
3. Enter valid credentials
4. Verify successful login and redirect

**Expected Results**:
- ✅ Clean login form with email/password fields
- ✅ Clear "Login" button and form labels
- ✅ Success redirect to intended page
- ✅ Navigation shows user as authenticated

**Pass/Fail**:
- [ ] Pass: Smooth login flow
- [ ] Fail: Form issues or redirect problems

### Scenario 2: Login Validation
**Steps**:
1. Try login with empty fields
2. Try login with invalid email format
3. Try login with wrong credentials
4. Check error message display

**Expected Results**:
- ✅ Required field validation messages
- ✅ Email format validation
- ✅ Clear "Invalid credentials" message
- ✅ Form doesn't reset on validation errors

**Pass/Fail**:
- [ ] Pass: Clear validation feedback
- [ ] Fail: Poor error messages or form resets

### Scenario 3: Logout Flow
**Steps**:
1. While logged in, find logout option
2. Click logout
3. Verify logout behavior
4. Try accessing protected pages

**Expected Results**:
- ✅ Logout option clearly visible in navigation
- ✅ Immediate logout (or confirmation if implemented)
- ✅ Redirect to login page
- ✅ Protected pages redirect to login

**Pass/Fail**:
- [ ] Pass: Complete logout functionality
- [ ] Fail: Logout doesn't work or partial logout

### Scenario 4: Registration Flow (if implemented)
**Steps**:
1. Navigate to registration page
2. Fill out registration form
3. Submit and verify account creation
4. Test automatic login after registration

**Expected Results**:
- ✅ Registration form with required fields
- ✅ Password confirmation validation
- ✅ Successful account creation
- ✅ Automatic login or redirect to login

**Pass/Fail**:
- [ ] Pass: Registration works end-to-end
- [ ] Fail: Registration errors or broken flow
- [ ] N/A: Registration not implemented

### Scenario 5: Session Management
**Steps**:
1. Login successfully
2. Close browser tab/window
3. Reopen demo shell
4. Check if still logged in

**Expected Results**:
- ✅ Session persists across browser sessions
- ✅ OR clear re-login required (depending on settings)
- ✅ Session timeout works (if implemented)
- ✅ No broken authentication state

**Pass/Fail**:
- [ ] Pass: Consistent session behavior
- [ ] Fail: Broken session state or unexpected logouts

## 🐛 Troubleshooting

### Login Fails
- **Check**: Django backend is running
- **Check**: User account exists in database
- **Check**: Password is correct
- **Check**: CSRF token issues (check console)

### Redirect Issues
- **Check**: Authentication middleware is configured
- **Check**: LOGIN_URL setting in Django
- **Check**: Frontend routing handles auth redirects

### Session Problems
- **Check**: SESSION_* settings in Django
- **Check**: Database has session table
- **Check**: Browser allows cookies

## ✅ Success Criteria

Authentication test succesvol als:
- Login flow works smoothly with clear feedback
- Validation provides helpful error messages
- Logout completely clears authentication state
- Session management is consistent and predictable
- Registration creates working accounts (if implemented)

**Status**: 🟡 TODO - Ready to Test
