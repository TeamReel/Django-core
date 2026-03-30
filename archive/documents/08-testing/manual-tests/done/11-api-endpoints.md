# API Endpoints - Visual Test Guide

## 🎯 Test Overview
- **Feature**: REST API endpoints functionality and responses
- **Time**: 12-15 minuten
- **Prerequisites**: Backend running, API client (browser dev tools, Postman, or curl)
- **Test Data**: Authentication tokens, test data for CRUD operations

## 🚀 Quick Access
- **API Base**: http://localhost:8000/api/
- **API Docs**: http://localhost:8000/api/docs/ (if available)
- **Admin Panel**: http://localhost:8000/admin
- **Browser Dev Tools**: F12 → Network tab

## 📋 Visual Test Scenarios

### Scenario 1: API Documentation Access
**Steps**:
1. Navigate to API documentation URL
2. Check API schema/documentation display
3. Review available endpoints
4. Test interactive API explorer (if available)

**Expected Results**:
- ✅ API documentation loads and is well-formatted
- ✅ All endpoints documented with parameters
- ✅ Example requests and responses provided
- ✅ Authentication requirements clearly stated

**Pass/Fail**:
- [ ] Pass: Comprehensive API documentation
- [ ] Fail: Missing docs or poor formatting
- [ ] N/A: API docs not implemented

### Scenario 2: Authentication Endpoints
**Steps**:
1. Test POST /api/auth/login with valid credentials
2. Test login with invalid credentials
3. Test token refresh endpoint (if available)
4. Test logout endpoint

**API Test Commands**:
```bash
# Login test
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass"}'

# Check response includes token
```

**Expected Results**:
- ✅ Login returns authentication token
- ✅ Invalid login returns clear error message
- ✅ Token refresh works (if implemented)
- ✅ Logout invalidates tokens

**Pass/Fail**:
- [ ] Pass: Authentication API works correctly
- [ ] Fail: Auth endpoints broken or insecure

### Scenario 3: Organizations API
**Steps**:
1. Test GET /api/v1/organisations/ (list)
2. Test POST /api/v1/organisations/ (create)
3. Test GET /api/v1/organisations/{id}/ (detail)
4. Test PUT/PATCH /api/v1/organisations/{id}/ (update)

**Expected Results**:
- ✅ List endpoint returns user's organizations
- ✅ Create endpoint accepts valid organization data
- ✅ Detail endpoint returns complete organization info
- ✅ Update endpoints modify organization successfully

**Pass/Fail**:
- [ ] Pass: Organizations CRUD API works
- [ ] Fail: API errors or incomplete functionality

### Scenario 4: Files API
**Steps**:
1. Test GET /api/files/ (list files)
2. Test POST /api/files/ (upload file)
3. Test GET /api/files/{id}/download/ (download)
4. Test DELETE /api/files/{id}/ (delete)

**Expected Results**:
- ✅ List returns user's files with metadata
- ✅ Upload accepts multipart file data
- ✅ Download returns file content with correct headers
- ✅ Delete removes file and returns confirmation

**Pass/Fail**:
- [ ] Pass: File management API works end-to-end
- [ ] Fail: Upload/download issues or broken endpoints

### Scenario 5: Permissions and Authorization
**Steps**:
1. Test API access without authentication
2. Test access with invalid/expired tokens
3. Test cross-organization data access
4. Test role-based endpoint restrictions

**Expected Results**:
- ✅ Unauthenticated requests return 401 Unauthorized
- ✅ Invalid tokens return 401 with clear error
- ✅ Cross-org access blocked with 403 Forbidden
- ✅ Role restrictions properly enforced

**Pass/Fail**:
- [ ] Pass: Robust API security and permissions
- [ ] Fail: Security holes or permission bypasses

### Scenario 6: Error Handling
**Steps**:
1. Test malformed JSON requests
2. Test missing required fields
3. Test invalid data types
4. Test server errors (500s)

**Expected Results**:
- ✅ 400 Bad Request for malformed data
- ✅ Clear field-specific error messages
- ✅ Validation errors return structured responses
- ✅ 500 errors don't expose sensitive information

**Pass/Fail**:
- [ ] Pass: Excellent API error handling
- [ ] Fail: Poor error responses or information leakage

### Scenario 7: API Performance
**Steps**:
1. Test response times for list endpoints
2. Test large file upload performance
3. Test concurrent request handling
4. Check for N+1 query problems

**Expected Results**:
- ✅ List endpoints respond under 500ms
- ✅ File uploads progress smoothly
- ✅ Concurrent requests don't cause issues
- ✅ Database queries are optimized

**Pass/Fail**:
- [ ] Pass: Good API performance across endpoints
- [ ] Fail: Slow responses or performance issues

### Scenario 8: API Consistency
**Steps**:
1. Check consistent response formats across endpoints
2. Verify pagination works similarly everywhere
3. Test date/time format consistency
4. Check error response format consistency

**Expected Results**:
- ✅ All endpoints return consistent JSON structure
- ✅ Pagination follows same pattern (limit/offset or cursor)
- ✅ Dates in ISO 8601 format consistently
- ✅ Error responses follow same schema

**Pass/Fail**:
- [ ] Pass: Consistent API design across all endpoints
- [ ] Fail: Inconsistent patterns or formats

## 🐛 Troubleshooting

### API Not Responding
- **Check**: Django server is running on correct port
- **Check**: URL patterns are configured correctly
- **Check**: CORS settings allow frontend requests
- **Check**: Database is accessible and has data

### Authentication Issues
- **Check**: Token authentication is configured
- **Check**: CSRF tokens are handled correctly
- **Check**: Session authentication works alongside token auth
- **Check**: User model and authentication backend are correct

### Permission Denied Errors
- **Check**: User has correct permissions/roles
- **Check**: Object-level permissions are configured
- **Check**: Organization/project context is passed correctly
- **Check**: Multi-tenancy filtering is working

### Performance Problems
- **Check**: Database indexes on commonly queried fields
- **Check**: API pagination is implemented
- **Check**: Select_related/prefetch_related for foreign keys
- **Check**: API rate limiting (if implemented)

## ✅ Success Criteria

API endpoints test succesvol als:
- All CRUD operations work correctly for each resource type
- Authentication and authorization are robust and secure
- Error handling provides clear, consistent feedback
- API performance meets expectations (< 500ms for most endpoints)
- Documentation is comprehensive and accurate
- API design is consistent across all endpoints
- Security measures prevent unauthorized access and data leakage

**Status**: 🟠 IN PROGRESS - Partially Implemented
