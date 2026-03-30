# Preferences Management - Visual Test Guide

## 🎯 Test Overview
- **Feature**: User preferences (theme, language, timezone, notifications)
- **Time**: 6-8 minuten
- **Prerequisites**: Demo shell running, user logged in
- **Test Data**: Default preferences and user customizations

## 🚀 Quick Access
- **Preferences Page**: http://localhost:3000/preferences
- **Navigation**: Sidebar → Configuration → "⚙️ Preferences"
- **API**: http://localhost:8000/api/v1/i18n-preferences/me/

## 📋 Visual Test Scenarios

### Scenario 1: Preferences Page Load
**Steps**:
1. Navigate to Preferences page
2. Check that preferences form loads
3. Review available preference categories
4. Verify current settings display correctly

**Expected Results**:
- ✅ Preferences page loads within 2 seconds
- ✅ Theme preference shows current selection (light/dark/auto)
- ✅ Language preference displays current language
- ✅ Timezone preference shows current timezone
- ✅ Notification preferences display current state

**Pass/Fail**:
- [ ] Pass: All preferences load and display correctly
- [ ] Fail: Page load errors or preferences not displayed

### Scenario 2: Theme Preference Update
**Steps**:
1. Locate theme preference section
2. Change theme from current setting (e.g., light → dark)
3. Click Save button
4. Verify theme changes immediately
5. Navigate to another page and back
6. Confirm theme persists

**Expected Results**:
- ✅ Theme switcher has three options: Light, Dark, Auto
- ✅ Theme changes immediately after save
- ✅ Success message confirms save
- ✅ Theme persists across navigation
- ✅ All pages respect new theme

**Pass/Fail**:
- [ ] Pass: Theme preference works and persists
- [ ] Fail: Theme doesn't apply or doesn't persist

### Scenario 3: Language Preference Update
**Steps**:
1. Locate language preference dropdown
2. Change language (e.g., English → Nederlands)
3. Save preferences
4. Verify UI updates (if i18n is implemented)
5. Check that language persists on refresh

**Expected Results**:
- ✅ Language dropdown shows available options
- ✅ Save succeeds with confirmation message
- ✅ Language preference persists
- ✅ If i18n implemented: UI text updates to selected language
- ✅ If i18n NOT implemented: preference saves but UI remains English

**Pass/Fail**:
- [ ] Pass: Language preference saves and persists
- [ ] Fail: Language preference doesn't save
- [ ] N/A: Language selection not yet implemented

### Scenario 4: Notification Preferences
**Steps**:
1. Locate notification preference section
2. Toggle email notification setting
3. Toggle marketing email setting
4. Save preferences
5. Verify changes are reflected

**Expected Results**:
- ✅ Email notifications toggle works
- ✅ Marketing email toggle works
- ✅ Changes save successfully
- ✅ Preferences reflect after save
- ✅ Toggles persist on page refresh

**Pass/Fail**:
- [ ] Pass: Notification preferences work correctly
- [ ] Fail: Toggles don't save or reset

### Scenario 5: Timezone Preference
**Steps**:
1. Locate timezone selection
2. Change timezone (e.g., UTC → Europe/Amsterdam)
3. Save preferences
4. Navigate to a page with timestamps (e.g., Audit Log)
5. Verify timestamps display in selected timezone

**Expected Results**:
- ✅ Timezone dropdown shows common timezones
- ✅ Save succeeds with confirmation
- ✅ Timezone persists on refresh
- ✅ Timestamps adjust to selected timezone (if implemented)

**Pass/Fail**:
- [ ] Pass: Timezone preference works
- [ ] Fail: Timezone doesn't save or apply
- [ ] N/A: Timezone formatting not yet implemented

### Scenario 6: Preference Persistence Across Sessions
**Steps**:
1. Set all preferences to non-default values
2. Save preferences
3. Logout
4. Login again
5. Navigate to Preferences page
6. Verify all preferences retained

**Expected Results**:
- ✅ Theme persists across logout/login
- ✅ Language persists across logout/login
- ✅ Notification settings persist
- ✅ Timezone persists
- ✅ No preferences reset to defaults

**Pass/Fail**:
- [ ] Pass: All preferences persist across sessions
- [ ] Fail: Preferences reset after logout/login

## 🐛 Troubleshooting

### Preferences Not Saving
- **Check**: Network tab shows successful POST/PATCH request
- **Check**: No JavaScript errors in console
- **Check**: API endpoint returns 200/204 status
- **Check**: localStorage updates (for theme)

### Theme Not Applying
- **Check**: Theme tokens are loaded in CSS
- **Check**: Body/root element has correct theme class
- **Check**: localStorage contains theme preference
- **Check**: Theme system is initialized

### Language Not Changing UI
- **Check**: i18n system is implemented (may be future feature)
- **Check**: Translation files exist for selected language
- **Check**: i18n middleware is active
- **Note**: If i18n not implemented, preference saves but UI stays English

## ✅ Success Criteria

Preferences test succesvol als:
- All preference options display and are editable
- Changes save successfully with user feedback
- Preferences persist across page navigation
- Preferences persist across logout/login sessions
- Theme changes apply immediately to UI
- No data loss or reset on save
- Form validation works (if applicable)

**Status**: 🟡 TODO - Ready to Test
