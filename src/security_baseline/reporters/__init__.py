"""Security reporters module - SecurityReport generation."""

# Register SecurityReporter with Constitutional Engine reporter registry
try:
    from constitution_engine.core.engine import Engine

    from security_baseline.reporters.security_reporter import SecurityReporter

    # This assumes an Engine instance is available at app startup
    # In practice, registration should occur in AppConfig.ready()
    # Example:
    # engine = Engine(...)
    # engine.register_reporter(SecurityReporter())
except ImportError:
    pass
