# Constitutional Alignment & Non-Goals

This document explains the guiding principles and intentional limitations of the Constitutional Enforcement Engine.

## Constitutional Principles

The engine embodies these core principles from the Django Core-App Constitution:

### 1. Simplicity Over Complexity

**Principle:** Favor simple, understandable solutions over clever, complex ones.

**How we apply it:**
- Clear pipeline architecture (config → context → rules → results → reports)
- Protocol-based interfaces instead of complex inheritance hierarchies
- Filesystem-only analysis (no import magic)
- Minimal external dependencies

### 2. Safety First

**Principle:** Never compromise on safety or security.

**How we apply it:**
- No code imports (eliminates import side effects)
- Subprocess execution with timeouts
- Error isolation (one rule failure doesn't crash engine)
- Explicit error handling at every level

### 3. Transparency

**Principle:** Operations should be observable and understandable.

**How we apply it:**
- Structured logging throughout
- Detailed error messages with context
- GitHub Actions annotations for CI visibility
- JSON output for machine processing
- Verbose modes for debugging

### 4. Extensibility

**Principle:** Make extension natural and easy.

**How we apply it:**
- Protocol-based plugin system
- Multiple extension points (rules, validators, reporters, adapters)
- Configuration-driven behavior
- Entry point discovery for third-party plugins

### 5. CI-First Design

**Principle:** Tools should work seamlessly in automation.

**How we apply it:**
- Zero-setup CI/CD integration
- Appropriate exit codes
- GitHub Actions native support
- Machine-readable output formats
- Environment variable configuration

## Non-Goals

These are things the engine **intentionally does not do**:

### ❌ Runtime Code Execution

**Why not:** Safety and speed.

The engine will never:
- Import your application code
- Execute Python modules
- Load Django settings at runtime
- Run database migrations
- Start web servers

**Instead:** Use subprocess execution for tools that need runtime analysis.

### ❌ Dynamic Import Analysis

**Why not:** Complexity and unreliability.

The engine will not:
- Trace dynamic imports
- Analyze `importlib` usage
- Follow runtime module loading
- Resolve conditional imports

**Instead:** Use static analysis tools (mypy, ruff) via subprocess.

### ❌ IDE Integration

**Why not:** Different problem domain.

The engine is not:
- A language server
- An IDE plugin
- A code formatter
- An autocomplete system

**Instead:** Use dedicated tools (pylance, ruff-lsp) for IDE features.

### ❌ Complex Configuration DSL

**Why not:** Simplicity and maintainability.

The engine will not:
- Create a custom configuration language
- Support arbitrary code execution in config
- Allow dynamic rule definition in config

**Instead:** Use simple YAML/TOML with clear schema.

### ❌ Code Modification

**Why not:** Safety and scope creep.

The engine will not:
- Rewrite code automatically
- Apply fixes
- Refactor code
- Modify files

**Instead:** Report violations and let users/tools fix them.

### ❌ Web UI

**Why not:** Unnecessary complexity.

The engine will not:
- Provide a web dashboard
- Include a REST API
- Serve HTTP endpoints

**Instead:** Use reporters to generate static reports (HTML, Markdown).

### ❌ Database Integration

**Why not:** State adds complexity.

The engine will not:
- Store results in a database
- Track history across runs
- Maintain state between executions

**Instead:** Output to files/logs; let external systems handle persistence.

## Design Decisions

### Why Filesystem-Only?

**Decision:** Never import application code.

**Rationale:**
- Importing has side effects (database connections, signal handlers, etc.)
- Import failures are hard to debug
- Slow (Django initialization takes seconds)
- Requires complete environment setup

**Trade-offs:**
- Can't analyze runtime behavior
- Can't detect dynamically registered components
- Limited to static file structure

**Conclusion:** The safety and speed benefits outweigh the limitations for our use case (CI/CD enforcement).

### Why Subprocess for Tools?

**Decision:** Run mypy, ruff, etc. as subprocesses rather than importing them.

**Rationale:**
- Tool independence (tools can upgrade independently)
- Process isolation (tool crashes don't crash engine)
- Standard tool behavior (same as developer runs locally)
- No version conflicts

**Trade-offs:**
- Requires tools to be installed
- Subprocess overhead (minimal)
- Parsing tool output (can be fragile)

**Conclusion:** subprocess is the right abstraction for external tools.

### Why Protocols Over Classes?

**Decision:** Use Protocol (structural typing) for plugin interfaces.

**Rationale:**
- No inheritance required (simpler for plugin authors)
- Duck typing support (more Pythonic)
- Easier testing (no complex class hierarchies)
- Better for third-party plugins

**Trade-offs:**
- Less type safety than ABC (but mypy helps)
- Protocol violations found at runtime (but tests catch this)

**Conclusion:** Protocols are more flexible and Pythonic.

### Why No Built-in Rules?

**Decision:** Core engine has no built-in rules (for now).

**Rationale:**
- Keep core minimal and focused
- Rules are project-specific
- Easy to add rules later
- Forces good plugin architecture

**Trade-offs:**
- Requires users to write rules initially
- Less "batteries included" feel

**Conclusion:** Start minimal, add common rules based on real usage.

## Scope Boundaries

### In Scope

✅ Static file analysis  
✅ Subprocess-based tool execution  
✅ CI/CD integration  
✅ Report generation  
✅ Plugin system  
✅ Configuration management  

### Out of Scope

❌ Runtime code execution  
❌ Code modification  
❌ IDE integration  
❌ Web interfaces  
❌ Database persistence  
❌ Complex query languages  

### Maybe Later

🤔 Built-in common rules  
🤔 More adapters (FastAPI, Flask, etc.)  
🤔 More reporters (HTML, PDF, etc.)  
🤔 Rule composition/chaining  
🤔 Performance profiling  

## When to Use This Engine

**Good fit:**
- Enforcing code quality in CI/CD
- Project-specific constitutional rules
- Django Core-App projects
- Python projects with specific requirements
- Teams wanting custom enforcement

**Not a good fit:**
- IDE code assistance (use language servers)
- Code formatting (use ruff, black)
- General-purpose linting (use ruff, pylint)
- Runtime monitoring (use APM tools)
- Database query analysis (use database-specific tools)

## Evolution Guidelines

As the engine evolves:

1. **Preserve simplicity** - complexity is a last resort
2. **Maintain safety** - no compromises on the no-import rule
3. **Keep it fast** - CI runs need to be quick
4. **Stay focused** - resist feature creep
5. **Document everything** - transparency requires documentation

## Questions to Ask

Before adding a feature, ask:

1. Does this align with our constitutional principles?
2. Does this violate any non-goals?
3. Can this be a plugin instead of core?
4. Does this add complexity?
5. Will this slow down CI runs?
6. Is there a simpler approach?

If answers suggest problems, reconsider or redesign.

## See Also

- [Main README](../../src/constitution_engine/README.md)
- [Architecture Documentation](../../src/constitution_engine/README.md#architecture)
- [Quick Start](./quickstart.md)
- [Django Core-App Constitution](../../.kittify/memory/constitution.md)
