# Search Engine Foundation - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Search Engine Foundation (B24)
- **Time**: 15 minutes
- **Prerequisites**: Demo Shell running, Football Leagues demo data seeded
- **Test Data**: Football demo data (Premier League, Ajax, users, etc.)

## 🚀 Quick Check Commands
```bash
# Rebuild search index
python manage.py rebuild_search_index

# Seed football demo data (if not already done)
python manage.py seed_football_data

# Run search backend tests
python -m pytest tests/search/ -v -m unit --no-migrations

# Start demo server
python manage.py runserver
```

## 📋 Visual Test Scenarios

### Scenario 1: Global Search - Organisation Discovery
**Narrative**: As a football administrator, I want to find Premier League by searching for "premier" to quickly access the competition.

**Steps**:
1. Navigate to http://localhost:8000/ui/search/
2. Login with demo credentials (e.g., `koeman@eredivisie.demo` / password from seed command)
3. Type "premier" in the search box
4. Click the "Search" button

**Expected Results**:
- ✅ Search results appear within 2 seconds
- ✅ "Organisations" section appears at the top
- ✅ "Premier League" organisation is listed
- ✅ Result shows: Title "Premier League", description, and link
- ✅ Search term "premier" is highlighted in bold (`<b>premier</b>`)
- ✅ "View All" button appears next to "Organisations" header

**Screenshot Checkpoints**:
- [ ] Search input with "premier" entered
- [ ] Grouped results showing "Organisations", "Projects", "Users" sections
- [ ] Highlighted text in results
- [ ] "View All" buttons for each category

**Pass/Fail**:
- [ ] Pass: All results display correctly with highlighting
- [ ] Fail: Document any missing results or performance issues

---

### Scenario 2: Global Search - Project Discovery
**Narrative**: As a club manager, I want to search for "Ajax" to find all related projects and club information.

**Steps**:
1. Stay on http://localhost:8000/ui/search/
2. Clear the search box
3. Type "ajax" in the search box
4. Press Enter or click "Search"

**Expected Results**:
- ✅ "Projects" section appears with "Ajax Amsterdam" project
- ✅ Project title, description, and content_type are displayed
- ✅ Text "ajax" is highlighted in the title
- ✅ Results are grouped by category (max 5 per category)
- ✅ Empty categories are not displayed

**Screenshot Checkpoints**:
- [ ] Search results for "ajax"
- [ ] Project section with club details
- [ ] Proper grouping (not exceeding 5 items per section)

**Pass/Fail**:
- [ ] Pass: Ajax project appears with correct details
- [ ] Fail: Missing results or incorrect grouping

---

### Scenario 3: User Search - Finding Coaches
**Narrative**: As a competition organizer, I want to find Ronald Koeman by searching for "koeman" to check his contact details.

**Steps**:
1. In the search box, type "koeman"
2. Submit the search

**Expected Results**:
- ✅ "Users" section appears
- ✅ "Ronald Koeman" user is listed
- ✅ User's email `koeman@eredivisie.demo` is shown in description
- ✅ Search term "koeman" is highlighted in results
- ✅ User link points to `/users/{id}/`

**Screenshot Checkpoints**:
- [ ] Users section with Ronald Koeman result
- [ ] Email displayed correctly
- [ ] Highlighted search term

**Pass/Fail**:
- [ ] Pass: User found with correct details
- [ ] Fail: User not found or missing details

---

### Scenario 4: Filtered Search - View All Projects
**Narrative**: As a user, I want to see all project results for "club" by clicking "View All" in the Projects section.

**Steps**:
1. Search for "club" in the global search
2. Note that multiple categories appear
3. Click the "View All" button next to the "Projects" heading
4. Observe the filtered results page

**Expected Results**:
- ✅ URL changes to `/ui/search/?q=club&types=projects`
- ✅ Only project results are displayed (no user/org sections)
- ✅ Pagination controls appear if more than 20 results
- ✅ Results show proper highlighting
- ✅ Page number and count information displayed

**Screenshot Checkpoints**:
- [ ] Filtered search URL with types parameter
- [ ] Paginated project-only results
- [ ] Pagination controls (if applicable)

**Pass/Fail**:
- [ ] Pass: Filtered results display correctly
- [ ] Fail: Filtering not working or pagination issues

---

### Scenario 5: Empty Query Handling
**Narrative**: As a user, I want appropriate feedback when searching with an empty query.

**Steps**:
1. Clear the search box completely
2. Click the "Search" button with an empty query

**Expected Results**:
- ✅ API returns `{"results": []}` (verified in browser DevTools)
- ✅ UI displays "Enter a query to start searching." or similar message
- ✅ No API calls are made to the search backend
- ✅ No error messages appear

**Screenshot Checkpoints**:
- [ ] Empty search state message
- [ ] No error indicators
- [ ] DevTools showing no backend API calls

**Pass/Fail**:
- [ ] Pass: Empty query handled gracefully
- [ ] Fail: Errors or unnecessary API calls

---

### Scenario 6: Permission Filtering (Security Test)
**Narrative**: As a user with limited permissions, I should only see search results for organisations and projects I have access to.

**Steps**:
1. Login as `farioli@ajax.demo` (Ajax coach - should see only Ajax-related content)
2. Search for "eredivisie"
3. Observe which organisations appear in results
4. Logout and login as `koeman@eredivisie.demo` (Competition admin - broader access)
5. Search for "eredivisie" again
6. Compare result sets

**Expected Results**:
- ✅ `farioli@ajax.demo` sees only Ajax Amsterdam project (no other clubs)
- ✅ `koeman@eredivisie.demo` sees all Eredivisie clubs/projects
- ✅ Users only see organisations where they are members
- ✅ No "access denied" messages - results simply don't appear
- ✅ Search backend applies `get_visible_ids()` filtering

**Screenshot Checkpoints**:
- [ ] Results for limited user (farioli)
- [ ] Results for admin user (koeman)
- [ ] Comparison showing permission differences

**Pass/Fail**:
- [ ] Pass: Permission filtering works correctly
- [ ] Fail: Users see unauthorized content

---

### Scenario 7: Search Result Highlighting
**Narrative**: As a user, I want to see which parts of the content matched my search query.

**Steps**:
1. Search for "premier league english"
2. Inspect the Premier League result
3. Check if "premier", "league", and "english" are highlighted
4. Open browser DevTools and inspect the HTML

**Expected Results**:
- ✅ Matching terms wrapped in `<b>` tags: `<b>premier</b> <b>league</b>`
- ✅ SearchHeadline PostgreSQL function is applied
- ✅ Highlighting appears in the description/snippet area
- ✅ HTML is properly escaped (no XSS vulnerabilities)

**Screenshot Checkpoints**:
- [ ] Visual highlighting in UI
- [ ] DevTools showing `<b>` tags in HTML
- [ ] Multiple highlighted terms

**Pass/Fail**:
- [ ] Pass: Highlighting works for all matching terms
- [ ] Fail: No highlighting or incorrect HTML

---

### Scenario 8: Performance Verification
**Narrative**: As a system administrator, I want to ensure search response times are under 200ms.

**Steps**:
1. Open browser DevTools (F12)
2. Go to the Network tab
3. Search for "ajax"
4. Look at the `/api/v1/search/?q=ajax` request timing
5. Repeat with different queries: "premier", "koeman", "club"

**Expected Results**:
- ✅ API response time < 200ms for all queries
- ✅ Total page load time < 500ms
- ✅ Database query count reasonable (check Django Debug Toolbar if enabled)
- ✅ No N+1 query issues

**Screenshot Checkpoints**:
- [ ] DevTools Network tab showing timing < 200ms
- [ ] Multiple query samples for performance consistency

**Pass/Fail**:
- [ ] Pass: All queries under 200ms
- [ ] Fail: Performance issues or slow queries (document times)

**Performance Notes**:
- Slow queries: _______________
- Database query count: _______________
- Potential optimizations needed: _______________

---

## 🐛 Troubleshooting

### Common Issues

**No Search Results Appear**:
- Check search index is populated: `python manage.py rebuild_search_index`
- Verify demo data is seeded: `python manage.py seed_football_data`
- Check PostgreSQL `pg_trgm` extension is enabled: `SELECT * FROM pg_extension WHERE extname='pg_trgm';`
- Inspect browser DevTools Console for JavaScript errors

**Permission Errors**:
- Ensure user is logged in
- Verify user has organisation memberships: `python manage.py shell` → `User.objects.get(email='...').organisation_memberships.all()`
- Check RBAC role assignments in admin panel

**Highlighting Not Working**:
- Verify SearchHeadline is applied in backend: check `src/search/api/views.py` line 50+
- Ensure `highlight` field is in SearchEntrySerializer
- Check browser HTML - `<b>` tags should be present in rendered output

**Performance Issues**:
- Run `EXPLAIN ANALYZE` on search queries in PostgreSQL
- Check database indexes on SearchEntry table
- Verify GIN index on `search_vector` field exists: `\d search_searchentry` in psql

**Frontend JavaScript Errors**:
- Check browser console for errors
- Verify API endpoint is accessible: curl http://localhost:8000/api/v1/search/?q=test
- Ensure CSRF token is properly handled in form submission

---

## ✅ Test Completion Checklist

### Functional Tests
- [ ] Scenario 1: Global Search - Organisation Discovery
- [ ] Scenario 2: Global Search - Project Discovery
- [ ] Scenario 3: User Search - Finding Coaches
- [ ] Scenario 4: Filtered Search - View All Projects
- [ ] Scenario 5: Empty Query Handling
- [ ] Scenario 6: Permission Filtering
- [ ] Scenario 7: Search Result Highlighting
- [ ] Scenario 8: Performance Verification

### Technical Validation
- [ ] API returns correct response format (plural keys: users, projects, organisations)
- [ ] SearchHeadline annotation works correctly
- [ ] Permission filtering prevents unauthorized access
- [ ] All queries complete in < 200ms
- [ ] No JavaScript errors in browser console
- [ ] Mobile responsive design works (test on phone/tablet if available)

### Documentation
- [ ] All screenshots captured
- [ ] Performance metrics recorded
- [ ] Issues/bugs documented
- [ ] Test results shared with team

---

## 📸 Screenshot Repository

**Store screenshots in**: `manual-tests/screenshots/036-search-engine-foundation/`

**Required Screenshots**:
1. `01-global-search-premier.png` - Scenario 1
2. `02-global-search-ajax.png` - Scenario 2
3. `03-user-search-koeman.png` - Scenario 3
4. `04-filtered-projects.png` - Scenario 4
5. `05-empty-query.png` - Scenario 5
6. `06-permission-filtering-limited.png` - Scenario 6a
7. `07-permission-filtering-admin.png` - Scenario 6b
8. `08-highlighting-detail.png` - Scenario 7
9. `09-devtools-performance.png` - Scenario 8

---

## 📊 Test Results Summary

**Test Date**: _______________
**Tester**: _______________
**Environment**: [ ] Local Dev [ ] Staging [ ] Production Demo

### Results
- **Total Scenarios**: 8
- **Passed**: _______
- **Failed**: _______
- **Blocked**: _______

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Performance Metrics
- Average search response time: _______ ms
- Slowest query: "_______" at _______ ms
- Database query count per search: _______

### Next Steps
- [ ] Report issues in issue tracker
- [ ] Update documentation
- [ ] Re-test failed scenarios after fixes
- [ ] Mark feature as "Done" in tasks.md

---

## 📚 Related Documentation

- **Feature Spec**: `kitty-specs/036-search-engine-foundation/spec.md`
- **API Documentation**: `src/search/api/views.py` (SearchAPIView docstring)
- **Backend Logic**: `src/search/backend/postgres.py`
- **Test Suite**: `tests/search/test_api.py`
- **Constitution**: Principle XIV (Demo-First Development)

---

## ✍️ Notes & Observations

Use this space for additional notes, observations, or edge cases discovered during testing:

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
