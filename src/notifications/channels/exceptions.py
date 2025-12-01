"""Notification channel exceptions."""


class ChannelError(Exception):
    """Base exception for notification channel errors."""

    def __init__(self, message: str, channel: str, recipient: str | None = None):
        """Initialize channel error.

        Args:
            message: Error description
            channel: Channel identifier (e.g., 'email', 'in-app')
            recipient: Optional recipient identifier
        """
        self.message = message
        self.channel = channel
        self.recipient = recipient
        super().__init__(message)


class TransientChannelError(ChannelError):
    """Retryable channel error (SMTP timeout, connection refused, rate limit)."""


class PermanentChannelError(ChannelError):
    """Non-retryable channel error (invalid email, mailbox full, blocked recipient)."""
