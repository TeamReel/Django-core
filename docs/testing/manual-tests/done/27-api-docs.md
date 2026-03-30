# API Documentation Browser - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Interactive API documentation (OpenAPI/Swagger)
- **Time**: 5-7 minuten
- **Prerequisites**: Demo shell running, backend API running
- **Test Data**: API endpoints from backend

## 🚀 Quick Access
- **API Docs Page**: http://localhost:3000/api-docs
- **Navigation**: Sidebar → Platform Status → "🔌 API Docs"
- **Direct API Docs**: http://localhost:8000/api/docs/

## 📋 Visual Test Scenarios

### Scenario 1: API Docs Page Load
**Steps**:
1. Navigate to API Docs page
2. Check that page loads
3. Review API documentation display
4. Verify metadata shows

**Expected Results**:
- ✅ Page loads within 3 seconds
- ✅ API documentation embedded or linked
- ✅ Total endpoints count displayed
- ✅ Total schemas count displayed
- ✅ Last updated timestamp shown

**Pass/Fail**:
- [ ] Pass: API docs page displays correctly
- [ ] Fail: Page load error or docs not visible

### Scenario 2: Swagger/OpenAPI UI Display
**Steps**:
1. Locate embedded Swagger UI (iframe or direct link)
2. Check that Swagger UI loads
3. Review endpoint organization
4. Verify endpoint groups/tags display

**Expected Results**:
- ✅ Swagger UI loads in iframe OR link opens in new tab
- ✅ API endpoints grouped by tags (Auth, Organisations, Projects, etc.)
- ✅ Each endpoint shows: method (GET/POST/etc.), path, description
- ✅ Expand/collapse functionality works for endpoint groups
- ✅ API version displayed

**Pass/Fail**:
- [ ] Pass: Swagger UI displays and is navigable
- [ ] Fail: Swagger UI doesn't load or shows errors
- [ ] N/A: API docs not yet implemented (fallback to link)

### Scenario 3: Endpoint Detail View
**Steps**:
1. Expand an endpoint (e.g., GET /api/v1/organisations/)
2. Review endpoint details
3. Check request parameters
4. Review response schema

**Expected Results**:
- ✅ Endpoint description shown
- ✅ Request parameters listed with types and descriptions
- ✅ Request body schema displayed (for POST/PATCH)
- ✅ Response schema shows expected structure
- ✅ Authentication requirements indicated

**Pass/Fail**:
- [ ] Pass: Endpoint details are comprehensive
- [ ] Fail: Details missing or incomplete
- [ ] N/A: Interactive docs not available

### Scenario 4: Try It Out Functionality
**Steps**:
1. Click "Try it out" on an endpoint (e.g., GET /api/v1/organisations/)
2. Fill in required parameters (if any)
3. Click "Execute"
4. Review response

**Expected Results**:
- ✅ "Try it out" button enables input fields
- ✅ Required parameters are clearly marked
- ✅ Execute button sends request
- ✅ Response shows: status code, response body, headers
- ✅ Authentication token auto-included (if logged in)

**Pass/Fail**:
- [ ] Pass: Try it out works and returns expected responses
- [ ] Fail: Execution fails or returns errors
- [ ] N/A: Try it out not available (read-only docs)

### Scenario 5: Schema Browser
**Steps**:
1. Locate schemas section in Swagger UI
2. Click on a schema (e.g., Organisation, Project)
3. Review schema properties
4. Check nested schemas

**Expected Results**:
- ✅ Schemas section lists all models
- ✅ Schema properties show: name, type, description, required status
- ✅ Nested schemas are expandable
- ✅ Example values provided
- ✅ Constraints indicated (min/max, format, etc.)

**Pass/Fail**:
- [ ] Pass: Schema browser is detailed and accurate
- [ ] Fail: Schemas missing or incomplete
- [ ] N/A: Schema browser not available

### Scenario 6: API Documentation Search
**Steps**:
1. Locate search functionality in docs
2. Search for an endpoint (e.g., "organisations")
3. Verify results display
4. Click result to navigate to endpoint

**Expected Results**:
- ✅ Search field available in Swagger UI
- ✅ Search returns matching endpoints
- ✅ Results include endpoint path and method
- ✅ Clicking result navigates to endpoint detail
- ✅ Search is responsive (results update as typing)

**Pass/Fail**:
- [ ] Pass: Search works and is useful
- [ ] Fail: Search broken or doesn't return results
- [ ] N/A: Search not available

## 🐛 Troubleshooting

### Swagger UI Not Loading
- **Check**: Backend API is running on port 8000
- **Check**: `/api/docs/` endpoint is accessible
- **Check**: CORS settings allow iframe embedding
- **Check**: drf-spectacular is installed and configured

### Try It Out Returns 401/403
- **Check**: User is logged in to demo shell
- **Check**: API authentication token is sent with request
- **Check**: Swagger UI configured to send auth headers
- **Check**: User has permissions for endpoint

### Schemas Empty or Incomplete
- **Check**: DRF serializers have proper docstrings
- **Check**: OpenAPI schema generation includes all apps
- **Check**: Schema cache is not stale
- **Check**: API versioning doesn't hide endpoints

## ✅ Success Criteria

API docs test succesvol als:
- API documentation page loads and displays correctly
- Swagger/OpenAPI UI is accessible and navigable
- All API endpoints are documented with details
- Request/response schemas are comprehensive
- Try it out functionality works for testing (if available)
- Schema browser shows all models
- Search helps find endpoints quickly (if available)
- Documentation is up-to-date with backend

**Status**: 🟡 TODO - Ready to Test
