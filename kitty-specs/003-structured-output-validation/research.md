# Research: Media Pipeline Hardening

**Feature**: 003-structured-output-validation (Media Pipeline Hardening)  
**Date**: 2026-03-31  
**Phase**: Research

## Executive Summary

Codebase analyse van alle media processing flows identificeert 5 kritieke gaps die preventief gehardened moeten worden. Geen nieuwe dependencies nodig — tenacity, Pillow, structlog al aanwezig.

## Decisions

### D1: Centrale validation module vs per-app modules

**Decision**: Create `src/media/validation/` als shared module.

**Rationale**:
- Validation logic wordt gebruikt door generative, video, files apps
- Geen tight coupling aan één app
- Follows existing pattern: `src/core/` voor shared utilities

**Evidence**: [E006] ErrorCategory pattern in tasks.py werkt goed en is reusable.

### D2: Retry strategy

**Decision**: Tenacity met exponential backoff (1s → 2s → 4s), max 3 attempts, cap 30s total.

**Rationale**:
- Balanceert recovery kans tegen user wait time
- Exponential backoff voorkomt cascade failures
- 30s cap voorkomt infinite blocking

**Evidence**: [E001] Gemini rate limits veroorzaken immediate failures bij batch jobs. [E007] tenacity al in requirements.

### D3: FFmpeg error categorization

**Decision**: Regex pattern matching op stderr naar 5 categorieën: OOM, TIMEOUT, CODEC, IO, CORRUPT.

**Rationale**:
- Patterns zijn stabiel en well-documented
- Simpel te maintainen vs ML classifier
- Direct actionable (OOM → retry, CODEC → fail permanently)

**Evidence**: [E003] Huidige FFmpeg errors zijn raw stderr zonder context.

### D4: Image validation approach

**Decision**: PIL-based validation met magic byte check, dimension limits (8192x8192), file size limits (20MB).

**Rationale**:
- PIL al in codebase, geen nieuwe dependency
- Magic byte check robuuster dan extension check
- 8192x8192 voorkomt memory exhaustion

**Evidence**: [E004] Uploads hebben alleen Django size check, geen format validation.

## Provider Inventory

| Provider | Location | Current State | Gap | Priority |
|----------|----------|---------------|-----|----------|
| **Gemini** | S001 | No retry | Add tenacity | P0 |
| **MiniMax** | S002 | Good retry | Add output quality | P1 |
| **Runway** | S010 | Basic HTTP | Add timeout + quality | P1 |
| **Pika/fal.ai** | S011 | Minimal | Add structured errors | P2 |
| **FFmpeg** | S004 | Basic stderr | Parse to categories | P1 |
| **RVM** | S005 | Good | No changes | P2 |
| **rembg** | S006 | Basic | Add PIL pre-validation | P1 |
| **PIL** | N/A | Per-call | Centralize validation | P0 |

## Codebase Analysis

### Verified Gaps

#### Gap 1: Gemini No Retry (P0)
**Source**: [S001] gemini_image.py  
**Finding**: [E001] Direct API call without retry wrapper  
**Impact**: Batch jobs fail after ~15-20 requests when rate limited  
**Fix**: `@retry(stop=stop_after_attempt(3), wait=wait_exponential(...))`

#### Gap 2: No Upload Validation (P0)
**Source**: [S009] files/views.py  
**Finding**: [E004] Only DATA_UPLOAD_MAX_MEMORY_SIZE, no PIL check  
**Impact**: Corrupt images crash PIL later in pipeline  
**Fix**: ImageValidator before storage

#### Gap 3: FFmpeg Raw Stderr (P1)
**Source**: [S004] video/services/_common.py  
**Finding**: [E003] stderr logged as-is, not parsed  
**Impact**: "FFmpeg failed" without actionable context  
**Fix**: FFmpegErrorParser with pattern matching

#### Gap 4: MiniMax No Quality Check (P1)
**Source**: [S002] minimax_client.py  
**Finding**: [E002] Good retry but no resolution verification  
**Impact**: Low-res video accepted without warning  
**Fix**: Check dimensions after download, return DEGRADED status

## Technology Stack

### Dependencies (all pre-existing)

| Package | Version | Use |
|---------|---------|-----|
| tenacity | ≥8.0 | Retry decorators |
| Pillow | ≥10.0 | Image validation |
| structlog | ≥23.0 | Unified logging |

### Patterns to Reuse

1. **ErrorCategory enum** (tasks.py) — extend for validation errors
2. **TRANSIENT_KEYWORDS** (tasks.py) — pattern for FFmpeg error detection
3. **structlog binding** — existing pattern in services

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PIL validation too slow | Low | Medium | Profile p95, lazy validation |
| Retry causes cascades | Medium | High | Add jitter, cap total time |
| FFmpeg patterns incomplete | Medium | Low | Log unmatched, iterate |
| Breaking uploads | Low | High | Feature flag for rollout |

---

## Open Questions

### Q1: Feature flag scope
Should the feature flag cover all validation or per-component?  
**Recommendation**: Per-component flags for granular rollout.

### Q2: Unified logging format
What fields should be mandatory in MediaLogEntry?  
**Recommendation**: job_id, provider, operation, status, duration_ms, error_category.

### Q3: Circuit breaker threshold
How many consecutive failures before disabling a provider?  
**Recommendation**: 5 failures in 5 minutes. P2 priority, can defer.

### Q4: Quality degradation policy
Should DEGRADED outputs be auto-retried or accepted with warning?  
**Recommendation**: Accept with warning + log. User can manually retry.

---

## References

See `research/source-register.csv` for full source list.  
See `research/evidence-log.csv` for detailed findings.
