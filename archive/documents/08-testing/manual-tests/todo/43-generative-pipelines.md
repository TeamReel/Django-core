# Manual Test: B34 Generative Pipelines

**Module:** #043 B34 — Generative Pipelines
**Status:** ✅ Implementation Complete | 📋 Testing TODO
**Feature Branch:** `043-ai-generation-pipeline` (merged)
**Test Environment:** Development/Staging

---

## Test Objectives

Verify that the generative pipelines system:
1. Manages versioned GenerationTemplates with JSON Schema validation
2. Processes GenerationRequests asynchronously via Celery
3. Stores GenerationOutputs with text/file results
4. Integrates with B11 Credits (reserve/settle/refund)
5. Supports OpenAI and LangGraph pipeline providers
6. Handles errors with proper retry logic

---

## Prerequisites

- [ ] Migrations applied: `python manage.py migrate generative`
- [ ] Celery worker running: `celery -A config worker --loglevel=info`
- [ ] Celery beat running (for scheduled tasks): `celery -A config beat`
- [ ] OpenAI API key configured: `OPENAI_API_KEY` in environment
- [ ] Test user with project access created
- [ ] At least one Project created
- [ ] B11 Credits configured (user has credit balance)

---

## Test Scenarios

### 1. Template Management

#### 1.1 Create Generation Template
- [ ] POST `/api/v1/generative/templates/`
  ```json
  {
    "project": "{project_uuid}",
    "name": "Blog Post Generator",
    "slug": "blog-post-generator",
    "version": "1.0.0",
    "input_schema": {
      "type": "object",
      "properties": {
        "topic": {"type": "string"},
        "length": {"type": "integer", "minimum": 100, "maximum": 2000}
      },
      "required": ["topic"]
    },
    "pipeline_config": {
      "provider": "openai",
      "model": "gpt-4",
      "temperature": 0.7,
      "max_tokens": 1000,
      "estimated_cost": 0.10
    },
    "retention_days": 30
  }
  ```
- [ ] Verify 201 response with template ID
- [ ] Verify `is_latest: true` flag set

#### 1.2 List Templates
- [ ] GET `/api/v1/generative/templates/?project={uuid}`
- [ ] Verify pagination works
- [ ] Verify project filtering works

#### 1.3 Clone Template (New Version)
- [ ] POST `/api/v1/generative/templates/{id}/clone/`
  ```json
  {
    "version": "1.1.0",
    "pipeline_config": {
      "provider": "openai",
      "model": "gpt-4-turbo",
      "temperature": 0.5
    }
  }
  ```
- [ ] Verify new template created with `parent_template` FK
- [ ] Verify old template now has `is_latest: false`

#### 1.4 Soft Delete Template
- [ ] DELETE `/api/v1/generative/templates/{id}/`
- [ ] Verify template marked as deleted (soft delete)
- [ ] Verify template no longer appears in list

---

### 2. Request Submission & Processing

#### 2.1 Submit Generation Request
- [ ] POST `/api/v1/generative/requests/`
  ```json
  {
    "template": "{template_uuid}",
    "input_data": {
      "topic": "The Future of AI in Sports Analytics",
      "length": 500
    }
  }
  ```
- [ ] Verify 202 Accepted response
- [ ] Verify request ID returned
- [ ] Verify status is `pending` or `processing`

#### 2.2 Input Validation Against Schema
- [ ] POST request with invalid input (missing required field)
- [ ] Verify 400 error with schema validation message

#### 2.3 Check Request Status
- [ ] GET `/api/v1/generative/requests/{id}/`
- [ ] Verify response includes:
  - `status`: pending → processing → completed
  - `retry_count`: number of attempts
  - `estimated_cost` / `actual_cost`
  - `output` reference (when completed)

#### 2.4 Cancel Pending Request
- [ ] Submit new request
- [ ] Immediately POST `/api/v1/generative/requests/{id}/cancel/`
- [ ] Verify status changes to `cancelled`
- [ ] Verify credits refunded (check B11 transaction)

---

### 3. Output Retrieval

#### 3.1 Retrieve Text Output
- [ ] Wait for request to complete
- [ ] GET `/api/v1/generative/outputs/{output_id}/`
- [ ] Verify `text_content` contains generated text
- [ ] Verify `output_type` is "text"

#### 3.2 Retrieve File Output (if applicable)
- [ ] Create template with file output type
- [ ] Submit and wait for completion
- [ ] GET output endpoint
- [ ] Verify `file_id` reference and presigned URL

#### 3.3 Output Expiration
- [ ] Check `expires_at` field on output
- [ ] Verify matches template's `retention_days`

---

### 4. Credit Integration (B11)

#### 4.1 Credit Reservation on Submit
- [ ] Note user's credit balance before
- [ ] Submit generation request
- [ ] Verify credits reserved (balance decreased by estimated_cost)

#### 4.2 Credit Settlement on Completion
- [ ] Wait for request to complete
- [ ] Verify credits settled to actual_cost
- [ ] Check B11 transaction record

#### 4.3 Credit Refund on Cancel/Failure
- [ ] Submit and cancel request
- [ ] Verify credits refunded to user
- [ ] Check refund transaction in B11

---

### 5. Pipeline Providers

#### 5.1 OpenAI Provider
- [ ] Create template with `provider: "openai"`
- [ ] Submit request
- [ ] Verify successful completion
- [ ] Check output quality

#### 5.2 LangGraph Provider (if configured)
- [ ] Create template with `provider: "langgraph"`
  ```json
  {
    "pipeline_config": {
      "provider": "langgraph",
      "graph_name": "default_chain",
      "model": "gpt-4"
    }
  }
  ```
- [ ] Submit request
- [ ] Verify LangGraph executor used

---

### 6. Error Handling & Retries

#### 6.1 Retry on Transient Failure
- [ ] Simulate API timeout (if possible)
- [ ] Verify `retry_count` increments
- [ ] Verify exponential backoff between retries

#### 6.2 Permanent Failure
- [ ] Submit request that will always fail (invalid model name)
- [ ] Verify status becomes `failed` after max retries
- [ ] Verify error message stored
- [ ] Verify credits refunded

---

### 7. WebSocket Events (Optional)

#### 7.1 Real-time Status Updates
- [ ] Connect to WebSocket: `ws://localhost/ws/generative/`
- [ ] Submit generation request
- [ ] Verify status updates received:
  - `pending`
  - `processing`
  - `completed` (with output reference)

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| Template CRUD | Create, version, clone, delete work |
| Input Validation | JSON Schema enforced |
| Async Processing | Celery handles jobs correctly |
| Credit Flow | Reserve → Settle/Refund works |
| OpenAI Provider | Generates content successfully |
| Error Handling | Retries and fails gracefully |

---

## Notes
<!-- Add test execution notes here -->

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
