---
name: web-design-reviewer
description: "Visual UI review of the running TeamReel site — detects layout issues, responsive problems, accessibility gaps, and design inconsistencies through actual browser inspection"
argument-hint: "URL to review (e.g. 'http://localhost:5173' or specific page)"
---

# Web Design Reviewer

Visually inspect the running TeamReel site through Playwright MCP to find layout issues, responsive problems, and design inconsistencies at the pixel level.

## Prerequisites

1. **Dev server running**: `http://localhost:5173`
2. **Playwright MCP available** (configured in `.vscode/mcp.json`)

## Review Workflow

### Step 1: Information Gathering
1. Navigate to the target URL
2. Detect the project structure (React + CSS Modules + design tokens)
3. Take initial screenshots at desktop viewport

### Step 2: Visual Inspection

#### Layout Issues
| Issue | Detection | Severity |
|-------|-----------|----------|
| Element overflow | Content spills outside container or viewport | High |
| Element overlap | Unintended overlapping elements | High |
| Alignment issues | Grid/flex alignment problems | Medium |
| Inconsistent spacing | Padding/margin inconsistencies | Medium |
| Text clipping | Long text not handled (overflow, ellipsis) | Medium |

#### Responsive Issues
| Issue | Detection | Severity |
|-------|-----------|----------|
| Non-mobile friendly | Layout breaks on small screens | High |
| Breakpoint problems | Awkward transitions between sizes | Medium |
| Small touch targets | Buttons < 44×44px on mobile | Medium |
| Horizontal scroll | Unintended horizontal overflow | High |

#### Design Token Compliance
| Issue | Detection | Severity |
|-------|-----------|----------|
| Hardcoded colors | Not using `var(--app-*)` tokens | High |
| Hardcoded spacing | Not using `var(--space-*)` tokens | Medium |
| Hardcoded radius | Not using `var(--radius-*)` tokens | Low |
| Missing focus ring | No `:focus-visible` style | High |

#### Visual Consistency
| Issue | Detection | Severity |
|-------|-----------|----------|
| Font inconsistency | Mixed font families or sizes | Medium |
| Color inconsistency | Non-unified brand colors | Medium |
| Spacing inconsistency | Non-uniform spacing between similar elements | Low |
| Shadow inconsistency | Different shadow styles on similar cards | Low |

### Step 3: Viewport Testing

Test at these viewports (screenshot each):

| Name | Width | Representative Device |
|------|-------|----------------------|
| Mobile | 375px | iPhone SE/12 mini |
| Tablet | 768px | iPad |
| Desktop | 1280px | Standard PC |
| Wide | 1920px | Large display |

### Step 4: Fix Issues

For each issue found:
1. Identify the source file from CSS class names or component structure
2. Search the codebase for the component/style file
3. Apply minimal fix using design tokens
4. Re-verify via screenshot

**Fix principles:**
- Use design tokens (never hardcode values)
- Respect existing patterns
- Mobile-first CSS (base = mobile, breakpoints add complexity)
- Minimal changes — fix only what's broken

### Step 5: Dark Mode Verification
1. Check that all colors come from semantic tokens (`var(--app-*)`)
2. No white backgrounds (use `var(--app-surface)`)
3. Borders visible with `var(--app-border)`
4. No white halos on images

## Output Format

```markdown
## Visual Review: [Page/URL]

### Screenshots
| Viewport | Before | After |
|----------|--------|-------|

### Issues Found
| # | Category | Severity | Element | Issue | Fix |
|---|----------|----------|---------|-------|-----|

### Design Token Violations
| File | Line | Current Value | Should Be |
|------|------|---------------|-----------|

### Score
| Dimension | Score | Status |
|-----------|-------|--------|
| Layout | X/10 | ✅/⚠️/❌ |
| Responsive | X/10 | ✅/⚠️/❌ |
| Token compliance | X/10 | ✅/⚠️/❌ |
| Dark mode | X/10 | ✅/⚠️/❌ |
| Visual consistency | X/10 | ✅/⚠️/❌ |
```
