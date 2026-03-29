"""Security reporters module - SecurityReport generation."""

# Register SecurityReporter with Constitutional Engine reporter registry
try:
    from constitution_engine.core.engine import Engine  # noqa: F401
    from security_baseline.reporters.security_reporter import SecurityReporter  # noqa: F401

    # This assumes an Engine instance is available at app startup
    # In practice, registration should occur in AppConfig.ready()
    # Example:
    # engine = Engine(...)
    # engine.register_reporter(SecurityReporter())
except ImportError:
    pass
