# Demo Shell Interface - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Demo shell frontend interface & navigation
- **Time**: 3 minuten
- **Prerequisites**: System health check passed, beide servers running
- **Test Data**: Gebruik demo user account

## 🚀 Quick Access
- **Demo URL**: http://localhost:3000 (of check terminal output voor exacte poort)
- **Backend**: http://localhost:8000
- **Servers starten**:
  ```bash
  # Terminal 1: Backend
  python manage.py runserver

  # Terminal 2: Frontend
  cd demo && pnpm dev
  ```

## 📋 Visual Test Scenarios

### Scenario 1: Demo Shell Loads
**Steps**:
1. Open browser naar http://localhost:3000
2. Wacht tot pagina volledig laadt
3. Check browser console (F12) voor errors

**Expected Results**:
- ✅ Demo shell interface toont binnen 3 seconden
- ✅ Geen JavaScript errors in console
- ✅ Sidebar navigation is zichtbaar
- ✅ Main content area toont welkomstpagina/dashboard

**Pass/Fail**:
- [ ] Pass: Clean interface load
- [ ] Fail: White page, errors, of lange laadtijd

### Scenario 2: Navigation Sidebar
**Steps**:
1. Bekijk linker sidebar navigatie
2. Klik een paar verschillende menu items
3. Check of groups expand/collapse werken
4. Test de verschillende secties

**Expected Results**:
- ✅ Sidebar is stable (geen flickering!)
- ✅ Menu groups kunnen in-/uitklappen
- ✅ Navigation links zijn klikbaar
- ✅ Active state wordt getoond
- ✅ Icons en labels zijn zichtbaar

**Visual Check Items**:
- Identity & Context section
- Configuration section
- Platform Status section
- Frontend Resources section
- Documentation section

**Pass/Fail**:
- [ ] Pass: Smooth navigation, no flickering
- [ ] Fail: Flickering, broken links, or missing sections

### Scenario 3: Responsive Design
**Steps**:
1. Test verschillende browser venster groottes
2. Resize van desktop → tablet → mobile
3. Check of interface blijft bruikbaar

**Expected Results**:
- ✅ Layout past zich aan verschillende schermgroottes aan
- ✅ Sidebar blijft toegankelijk op smaller screens
- ✅ Content blijft leesbaar op alle sizes
- ✅ Geen horizontal scrolling

**Pass/Fail**:
- [ ] Pass: Responsive behavior works
- [ ] Fail: Layout breaks or becomes unusable

### Scenario 4: Key Demo Features Access
**Steps**:
1. Navigeer naar "📁 File Management Demo"
2. Navigeer naar "🎨 Design System"
3. Navigeer naar "🔐 Auth Flows"
4. Check of pagina's laden zonder errors

**Expected Results**:
- ✅ File Management demo toont upload interface
- ✅ Design System toont component gallery
- ✅ Auth flows tonen login interface
- ✅ Alle pagina's laden binnen redelijke tijd

**Pass/Fail**:
- [ ] Pass: All key demo pages accessible
- [ ] Fail: 404s, loading errors, or broken interfaces

### Scenario 5: Theme System (if available)
**Steps**:
1. Zoek naar theme toggle/switcher
2. Test light/dark mode switching
3. Check of preferences worden onthouden

**Expected Results**:
- ✅ Theme switcher is vindbaar en bruikbaar
- ✅ Smooth transition tussen themes
- ✅ Preference wordt bewaard na page refresh
- ✅ Consistent styling across alle components

**Pass/Fail**:
- [ ] Pass: Theme system works smoothly
- [ ] Fail: Broken theme switching or inconsistent styling
- [ ] N/A: Theme system not yet implemented

## 🐛 Troubleshooting

### White Page Issues
- Check browser console voor JavaScript errors
- Verify beide servers (frontend + backend) draaien
- Clear browser cache en refresh
- Check if correct port is being used

### Navigation Flickering
- Check Sidebar.tsx for useEffect dependencies
- Verify navGroups is defined outside component
- Look for infinite re-render loops

### Slow Loading
- Check network tab for failed requests
- Verify backend API is responding
- Check for large bundle sizes

### Style Issues
- Verify design-system package is built
- Check for CSS loading errors
- Verify theme system is working

## 📊 Test Results

**Template**:
```
Date tested: [TODAY'S DATE]
Browser: [Chrome/Firefox/Safari/Edge + version]
Screen size tested: [Desktop/Tablet/Mobile]
Demo shell port: [3000/3001/3002]
Status: [ ] ✅ Pass / [ ] ❌ Fail / [ ] ⚠️ Partial

Performance notes:
- Page load time: [X seconds]
- Navigation smoothness: [Smooth/Choppy/Broken]
- Console errors: [None/List any errors]

Issues found:
- [List any issues with screenshots if possible]

Feature availability:
- [ ] File Management Demo
- [ ] Design System Gallery
- [ ] Auth Flows
- [ ] Theme Switching
- [ ] Responsive Design

Notes:
- [Any observations or suggestions]
```

## ✅ Success Criteria

Dit test is succesvol als:
- Demo shell laadt clean zonder errors
- Navigation werkt smooth zonder flickering
- Key demo features zijn toegankelijk
- Responsive design werkt op verschillende screen sizes
- Performance is acceptabel (< 3 sec load time)

**Next Steps**:
- Voor specifieke features: gebruik relevante feature test guides
- Voor complete validatie: run [file-management.md](file-management.md)
