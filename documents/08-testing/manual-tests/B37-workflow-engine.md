# Manual Test: B37 Workflow Engine & State Machine

**Feature**: B37 Workflow Engine & State Machine
**Branch**: `048-workflow-engine-state`
**Test Environment**: Railway Production
**Prerequisites**:
- Migrations applied
- Seed data loaded
- Admin access
- API authentication token

## Setup

1. Ensure you are logged in to Railway production
2. Navigate to the Django Admin interface
3. Obtain an API token from `/api/auth/token/`

## Test Case 1: Create Workflow Template (Django Admin)

**Objective**: Verify workflow templates can be created via Django Admin

**Steps**:
1. Login as admin/superuser
2. Navigate to `/admin/workflows/workflowtemplate/`
3. Click **"Add workflow template"**
4. Fill in the form:
   - Name: `Test Approval Workflow`
   - Version: `1.0.0`
   - Description: `Test workflow for manual testing`
   - Is Active: ✓ (checked)
   - Definition (JSON):
     ```json
     {
       "states": [
         {"name": "draft", "is_initial": true, "is_terminal": false},
         {"name": "approved", "is_initial": false, "is_terminal": true}
       ],
       "transitions": [
         {
           "action": "approve",
           "from_state": "draft",
           "to_state": "approved",
           "permissions": [],
           "sync_hooks": [],
           "async_hooks": []
         }
       ]
     }
     ```
5. Click **"Save"**

**Expected Results**:
- ✓ Template saves successfully
- ✓ Template appears in workflow template list
- ✓ Formatted definition shows pretty-printed JSON
- ✓ Created/Updated timestamps are populated

**Pass Criteria**: Template visible in list with correct name and version

---

## Test Case 2: Create Workflow Instance (API)

**Objective**: Verify workflow instances can be created via REST API

**Prerequisites**:
- At least one WorkflowTemplate exists (from Test Case 1 or seed data)
- A Project exists in the database
- A content object exists (e.g., an Article, Video, or any Django model)

**Steps**:
1. Get template ID from Django Admin or API: `GET /api/workflows/templates/`
2. Get project ID and content type details
3. Send POST request to `/api/workflows/instances/`:
   ```bash
   curl -X POST https://your-railway-domain/api/workflows/instances/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "workflow": 1,
       "project": 1,
       "content_type": "articles.article",
       "object_id": 123,
       "context": {"author": "test@example.com"}
     }'
   ```

**Expected Results**:
- ✓ HTTP 201 Created response
- ✓ Response includes:
  - `id` (instance ID)
  - `workflow` (template ID)
  - `current_state` = "draft" (initial state)
  - `status` = "active"
  - `context` matches input
- ✓ Instance visible in Django Admin at `/admin/workflows/workflowinstance/`

**Pass Criteria**: Instance created with correct initial state and context

---

## Test Case 3: Execute Transition (API)

**Objective**: Verify state transitions work correctly

**Prerequisites**:
- WorkflowInstance from Test Case 2 (in "draft" state)

**Steps**:
1. Note the instance ID from Test Case 2
2. Send POST request to `/api/workflows/instances/{id}/execute_transition/`:
   ```bash
   curl -X POST https://your-railway-domain/api/workflows/instances/1/execute_transition/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "approve",
       "comment": "Approved via manual test"
     }'
   ```

**Expected Results**:
- ✓ HTTP 200 OK response
- ✓ Response includes:
  - `id` (same instance ID)
  - `current_state` = "approved" (new state)
  - `status` = "completed" (terminal state reached)
- ✓ TransitionHistory record created with:
  - `from_state` = "draft"
  - `to_state` = "approved"
  - `action` = "approve"
  - `comment` = "Approved via manual test"
  - `actor` = current user

**Pass Criteria**: State changes from draft → approved, history recorded

---

## Test Case 4: View Transition History (API)

**Objective**: Verify transition history is queryable

**Prerequisites**:
- WorkflowInstance from Test Case 3 (with at least one transition)

**Steps**:
1. Send GET request to `/api/workflows/instances/{id}/history/`:
   ```bash
   curl -X GET https://your-railway-domain/api/workflows/instances/1/history/ \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Expected Results**:
- ✓ HTTP 200 OK response
- ✓ Response is an array with at least one history entry
- ✓ Each entry includes:
  - `action` = "approve"
  - `from_state` = "draft"
  - `to_state` = "approved"
  - `actor` (user ID or name)
  - `comment` = "Approved via manual test"
  - `created_at` (timestamp)
  - `task_id` (UUID or null)

**Pass Criteria**: History endpoint returns transition records

---

## Test Case 5: View Instance in Django Admin

**Objective**: Verify workflow instances are accessible via Django Admin

**Steps**:
1. Navigate to `/admin/workflows/workflowinstance/`
2. Find the instance created in Test Case 2
3. Click on the instance to view details
4. Scroll to **"Transition History"** inline section

**Expected Results**:
- ✓ Instance details page loads
- ✓ Current state shows "approved"
- ✓ Status shows "completed"
- ✓ Context JSON is displayed
- ✓ Transition History inline shows all transitions (at least one)
- ✓ Each transition row shows:
  - Action
  - From state → To state
  - Actor
  - Comment
  - Timestamp

**Pass Criteria**: Admin interface displays all workflow data correctly

---

## Test Case 6: List Workflows by Project (API)

**Objective**: Verify filtering workflows by project

**Steps**:
1. Send GET request to `/api/workflows/instances/?project={project_id}`:
   ```bash
   curl -X GET https://your-railway-domain/api/workflows/instances/?project=1 \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Expected Results**:
- ✓ HTTP 200 OK response
- ✓ Response includes only instances for specified project
- ✓ Pagination works (if > 10 instances)
- ✓ Each instance includes:
  - `id`
  - `workflow` (template reference)
  - `current_state`
  - `status`
  - `created_at`

**Pass Criteria**: Only project-filtered instances returned

---

## Test Case 7: Swagger API Documentation

**Objective**: Verify all endpoints are documented in Swagger

**Steps**:
1. Navigate to `/api/schema/swagger-ui/`
2. Expand the **"workflows"** tag
3. Verify the following endpoints exist:
   - `GET /api/workflows/templates/` - List templates
   - `POST /api/workflows/templates/` - Create template
   - `GET /api/workflows/templates/{id}/` - Template detail
   - `PATCH /api/workflows/templates/{id}/` - Update template
   - `DELETE /api/workflows/templates/{id}/` - Delete template
   - `GET /api/workflows/instances/` - List instances
   - `POST /api/workflows/instances/` - Create instance
   - `GET /api/workflows/instances/{id}/` - Instance detail
   - `POST /api/workflows/instances/{id}/execute_transition/` - Execute transition
   - `GET /api/workflows/instances/{id}/history/` - Transition history

**Expected Results**:
- ✓ All 10 endpoints are documented
- ✓ Each endpoint shows request/response schemas
- ✓ "Try it out" button works for authenticated requests

**Pass Criteria**: Swagger docs complete and functional

---

## Test Case 8: Railway Logs Verification

**Objective**: Ensure no errors in production logs

**Steps**:
1. Open Railway project dashboard
2. Navigate to **"Deployments"** → Latest deployment
3. Click **"View Logs"**
4. Filter logs during test execution (Test Cases 1-7)

**Expected Results**:
- ✓ No HTTP 500 errors
- ✓ No Django exceptions (except expected validation errors)
- ✓ Audit events logged (if B09 integration enabled)
- ✓ Celery tasks spawned (if B15 integration enabled)
- ✓ No database connection errors

**Pass Criteria**: Logs show successful requests with no exceptions

---

## Test Case 9: Seed Data Verification

**Objective**: Verify seed script creates expected templates

**Steps**:
1. SSH into Railway or run locally: `python scripts/seed_workflows.py`
2. Check output shows 3 templates created/updated:
   - Content Approval
   - Support Ticket
   - Invoice Approval
3. Navigate to `/admin/workflows/workflowtemplate/`
4. Verify all 3 templates exist

**Expected Results**:
- ✓ Script runs without errors
- ✓ Output shows "✓ Created/Updated workflow: ..." for each template
- ✓ Total template count = 3 (or more if others exist)
- ✓ All templates have `is_active=True`

**Pass Criteria**: Seed script is idempotent and creates 3 templates

---

## Test Case 10: Error Handling - Invalid Transition

**Objective**: Verify graceful error handling for invalid transitions

**Steps**:
1. Use an instance in "approved" state (terminal)
2. Try to execute another transition:
   ```bash
   curl -X POST https://your-railway-domain/api/workflows/instances/{id}/execute_transition/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action": "approve"}'
   ```

**Expected Results**:
- ✓ HTTP 400 Bad Request response
- ✓ Error message: "No valid transition for action 'approve' from state 'approved'"
- ✓ Instance state remains unchanged

**Pass Criteria**: Invalid transitions rejected with clear error

---

## Summary Checklist

- [ ] Test Case 1: Create template via admin ✓
- [ ] Test Case 2: Create instance via API ✓
- [ ] Test Case 3: Execute transition via API ✓
- [ ] Test Case 4: View history via API ✓
- [ ] Test Case 5: View instance in admin ✓
- [ ] Test Case 6: Filter by project ✓
- [ ] Test Case 7: Swagger docs complete ✓
- [ ] Test Case 8: No errors in Railway logs ✓
- [ ] Test Case 9: Seed data works ✓
- [ ] Test Case 10: Invalid transition handled ✓

**Definition of Done**: All 10 test cases pass without errors
