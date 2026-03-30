# Fase 14: Data Foundations Part 2

## 61. D07 – Tool-Call Logging Infrastructure

**Doel**: Secure logging van AI agent tool calls met automatic secret redaction en audit trail.

**Waarom agnostisch**: Tool-call logging is universeel - agent debugging, compliance, security.

**Wat moet er gebeuren**:
- Structured logging (JSON: tool name, args, result, duration, agent_id)
- Secret redaction (auto-detect API keys, tokens, passwords, PII)
- Audit trail via B09 (immutable log)
- Query interface (filter by agent, tool, date, success/failure)
- Retention policies (auto-archive old logs)

**Demo Requirements**:
- 🔧 **Tool Calls Log** (`/demo/tool-calls`): List recent calls → filter → view redacted logs
- Tests: trigger tool call → verify logging → check redaction

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=D07-tool-call-logging

[feature summary]
Secure logging of AI agent tool calls with secret redaction.

[goals]
- All tool calls logged with structured format
- Secret redaction for 10+ common patterns
- B09 audit integration (immutable trail)
- Query interface with filters
- Retention policy archives logs >90 days

[demo requirements]
Demo page: /demo/tool-calls
- List recent tool calls
- Filter by agent/tool/date
- View redacted logs
- Test secret redaction
```

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
