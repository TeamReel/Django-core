# Manual Test: B31 Content Templates & Generation

## Feature Overview
Content templates for AI-powered content generation with approval workflow and content library.

## Prerequisites
- [ ] Django server running (`python manage.py runserver`)
- [ ] Redis running (for Celery tasks)
- [ ] Celery worker running (`celery -A src.config worker -l info`)
- [ ] Demo user authenticated
- [ ] At least one Organisation and Project created

## Test Scenarios

### 1. Content Template Management

#### 1.1 List Templates
- [ ] Navigate to `/api/v1/content/templates/`
- [ ] Verify seed templates exist (Pre-Match Video, Post-Match Summary, etc.)
- [ ] Verify template fields: name, template_type, sport, is_active

#### 1.2 Filter Templates
- [ ] Filter by `template_type=pre_match`
- [ ] Filter by `sport=football`
- [ ] Filter by `is_active=true`
- [ ] Verify pagination works

#### 1.3 Template Detail
- [ ] GET `/api/v1/content/templates/{id}/`
- [ ] Verify `template_settings` JSON structure
- [ ] Verify `ai_workflow_id` is set

### 2. Content Generation

#### 2.1 Create Content Item
- [ ] POST `/api/v1/content/items/`
```json
{
  "template": "<template_uuid>",
  "project": "<project_uuid>",
  "input_data": {
    "match_title": "Test Match",
    "home_team": "Team A",
    "away_team": "Team B"
  }
}
```
- [ ] Verify status is `queued`
- [ ] Verify `created_by` is current user

#### 2.2 Generate Content (Async)
- [ ] POST `/api/v1/content/items/{id}/generate/`
- [ ] Verify status changes to `generating`
- [ ] Verify Celery task is triggered (check logs)
- [ ] Wait for completion, verify status becomes `completed`

#### 2.3 Content with Activity Link
- [ ] Create content item with `activity` field set
- [ ] Verify activity relationship is established
- [ ] Verify activity filtering works

### 3. Approval Workflow

#### 3.1 Submit for Approval
- [ ] POST `/api/v1/content/items/{id}/submit_for_approval/`
- [ ] Verify status changes to `pending_approval`

#### 3.2 Create Approval
- [ ] POST `/api/v1/content/approvals/`
```json
{
  "content_item": "<item_uuid>",
  "status": "approved",
  "feedback_text": "Looks great!"
}
```
- [ ] Verify content item status updates to `approved`
- [ ] Verify `approved_by` and `approved_at` are set

#### 3.3 Rejection Flow
- [ ] Create approval with `status=rejected`
- [ ] Verify content item status is `rejected`
- [ ] Verify notification is sent (check B17)

#### 3.4 Revision Request
- [ ] Create approval with `status=revision_requested`
- [ ] Verify feedback_text is captured
- [ ] Verify content can be re-submitted

### 4. Content Library

#### 4.1 List Content Items
- [ ] GET `/api/v1/content/items/`
- [ ] Verify filtering by `status`
- [ ] Verify filtering by `template`
- [ ] Verify filtering by `project`
- [ ] Verify ordering by `created_at`

#### 4.2 Content Detail
- [ ] GET `/api/v1/content/items/{id}/`
- [ ] Verify `input_data` is returned
- [ ] Verify `output_file` link (if completed)
- [ ] Verify approval history is included

#### 4.3 Download Content
- [ ] GET `/api/v1/content/items/{id}/download/`
- [ ] Verify file is served (if B22 FileAsset exists)
- [ ] Verify permission check (only approved content)

### 5. Permissions & Security

#### 5.1 Organisation Scoping
- [ ] Create content in Project A
- [ ] Switch to different organisation
- [ ] Verify content is not visible

#### 5.2 Role-Based Access
- [ ] As `viewer`: Can view templates, cannot create items
- [ ] As `member`: Can create items, cannot approve own items
- [ ] As `admin`: Can manage templates, can approve any item

#### 5.3 Approval Restrictions
- [ ] Verify creator cannot approve their own content
- [ ] Verify only users with `content.approve` permission can approve

### 6. Integrations

#### 6.1 B22 Files Integration
- [ ] Verify `output_file` creates FileAsset on completion
- [ ] Verify thumbnail generation (if applicable)
- [ ] Verify file cleanup on item deletion

#### 6.2 B17 Notifications
- [ ] Verify notification on content completion
- [ ] Verify notification on approval status change
- [ ] Verify notification preferences are respected

#### 6.3 B09 Audit Trail
- [ ] Verify audit log on content creation
- [ ] Verify audit log on status changes
- [ ] Verify audit log on approvals

### 7. Admin Interface

#### 7.1 Django Admin
- [ ] Navigate to `/admin/content_generation/`
- [ ] Verify ContentTemplate admin
- [ ] Verify ContentItem admin with filters
- [ ] Verify ContentApproval inline

### 8. Health Check

#### 8.1 Observability
- [ ] GET `/api/v1/health/`
- [ ] Verify `content_generation` component is included
- [ ] Verify Celery queue status is reported

## Expected Results
- All CRUD operations work correctly
- Async generation via Celery functions
- Approval workflow enforces business rules
- Permissions are properly scoped
- Integrations with B22, B17, B09 work
- Audit trail captures all actions

## Notes
- Celery worker must be running for async generation
- Redis must be running for task queue
- B32 Sport Configuration is optional (not implemented yet)
