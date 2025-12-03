# ADR 005: Routing Rule Evaluation Order

**Status**: Accepted  
**Date**: 2025-12-03  
**Deciders**: Architecture Team  
**Context**: B17 Contextual Notification Service

## Context and Problem Statement

When multiple routing rules match the same event, we need a deterministic way to evaluate them. The system must decide:
1. Which rules take precedence?
2. How do we handle conflicts between global, org, and project scopes?
3. Should we execute all matching rules or stop after the first match?

## Decision Drivers

- **Predictability**: Admins must understand which rules will fire
- **Performance**: Minimize database queries and rule evaluations
- **Flexibility**: Support both broad (global) and specific (project) rules
- **Debugging**: Clear audit trail of which rules matched

## Considered Options

### Option 1: First Match Wins (Stop on First Rule)
- Evaluate rules in priority order
- Execute only the first matching rule
- Stop evaluation immediately

**Pros**: Fast, simple, predictable  
**Cons**: Can't combine rules (e.g., both email and in-app)

### Option 2: Execute All Matching Rules
- Evaluate all rules that match the event
- Execute all of them
- Deduplicate recipients at handoff

**Pros**: Flexible, allows multi-channel notifications  
**Cons**: Slower, potential for spam, complex deduplication

### Option 3: Scope-Based Precedence with Priority (Selected)
- Evaluate rules in order: **Project → Organisation → Global**
- Within each scope, evaluate by **priority** (urgent > high > normal > low)
- Execute **all matching rules** in that order
- Later rules can't override earlier rules (additive only)

**Pros**: 
- Combines predictability with flexibility
- Specific rules (project) override general rules (global)
- Priority within scope gives fine-grained control
- Supports multi-channel notifications naturally

**Cons**:
- More complex evaluation logic
- Requires deduplication at handoff

## Decision Outcome

**Chosen option: Scope-Based Precedence with Priority (Option 3)**

### Evaluation Order

```python
# Pseudo-code for rule evaluation
matching_rules = []

# 1. Project-scoped rules first (most specific)
if event.project_id:
    project_rules = RoutingRule.objects.filter(
        event_type=event.type,
        scope='project',
        project_id=event.project_id,
        enabled=True
    ).order_by('-priority', 'id')
    matching_rules.extend(project_rules)

# 2. Organisation-scoped rules second
if event.organisation_id:
    org_rules = RoutingRule.objects.filter(
        event_type=event.type,
        scope='org',
        organisation_id=event.organisation_id,
        enabled=True
    ).order_by('-priority', 'id')
    matching_rules.extend(org_rules)

# 3. Global rules last (least specific)
global_rules = RoutingRule.objects.filter(
    event_type=event.type,
    scope='global',
    enabled=True
).order_by('-priority', 'id')
matching_rules.extend(global_rules)

# Execute all matching rules
for rule in matching_rules:
    execute_rule(rule, event)

# Deduplicate recipients at handoff
# (Same user, same channel → keep highest priority)
```

### Priority Mapping

- **urgent**: 3 (e.g., task.overdue)
- **high**: 2 (e.g., task.assigned)
- **normal**: 1 (e.g., project.updated)
- **low**: 0 (e.g., informational events)

### Example Scenario

**Event**: `project.updated` in Project 42 (Org 1)

**Rules**:
1. Project 42 rule: `email`, priority `high`
2. Org 1 rule: `in_app`, priority `normal`
3. Global rule: `in_app`, priority `normal`

**Evaluation**:
1. ✅ Project rule matches → Add `email` notification
2. ✅ Org rule matches → Add `in_app` notification
3. ⊗ Global rule matches but user already targeted for `in_app` via org rule → Deduplicated at handoff

**Result**: User receives **both** email and in-app notifications (distinct channels, no conflict).

### Deduplication Strategy

At handoff to B16, deduplicate by `(user_id, channel, event_type)`:
- If same user targeted multiple times for same channel, keep **highest priority** rule
- Different channels (email vs in_app) are NOT deduplicated (both execute)

## Consequences

### Positive

- **Predictable**: Scope order is intuitive (specific → general)
- **Flexible**: Supports multi-channel notifications
- **Debuggable**: Audit log shows all matching rules
- **Extensible**: Easy to add new scopes (e.g., team-level) later

### Negative

- **Performance**: Must query 3 scopes separately (mitigated with indexes)
- **Complexity**: Requires deduplication logic at handoff
- **Rule proliferation**: Admins might create redundant rules

### Mitigation

- **Indexes**: Add composite indexes on `(event_type, scope, organisation_id, project_id, enabled)`
- **Caching**: Cache active rules in Redis (5-minute TTL)
- **Audit logging**: Log all matched rules for debugging
- **UI guidance**: Admin UI shows "effective rules" preview for an event

## Related Decisions

- **ADR 006**: Suppression Strategy (deduplication at different layer)
- **Research**: Rule evaluation performance testing

## References

- [RoutingService Implementation](../../src/contextual_notifications/services/routing_service.py)
- [Routing Rule Model](../../src/contextual_notifications/models/routing_rule.py)
- [B09 Audit Logging](../audit/README.md)
