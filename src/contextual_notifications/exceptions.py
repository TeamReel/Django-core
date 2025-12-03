"""Custom exceptions for contextual_notifications app."""


class EventServiceError(Exception):
    """Base exception for event service errors."""

    pass


class ValidationError(Exception):
    """Exception raised when event validation fails."""

    def __init__(self, message: str, errors: dict[str, str] | None = None):
        """
        Initialize validation error.

        Args:
            message: Human-readable error message
            errors: Dictionary of field-specific validation errors
        """
        super().__init__(message)
        self.errors = errors or {}

    def __str__(self) -> str:
        """Return string representation including field errors."""
        if self.errors:
            error_details = ", ".join(f"{field}: {error}" for field, error in self.errors.items())
            return f"{super().__str__()} - {error_details}"
        return super().__str__()
