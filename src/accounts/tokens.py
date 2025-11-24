from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Token generator for email verification with 24-hour expiry."""

    # Set timeout to 24 hours (in seconds)
    timeout = 24 * 60 * 60  # 24 hours

    def _make_hash_value(self, user, timestamp):
        # Include email_verified status so token invalid after verification
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()

# Password reset uses Django's default (1-hour expiry is Django default)
