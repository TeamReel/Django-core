"""Custom exceptions for B34 Generative Pipelines.

Provides domain-specific exceptions for credit management and API errors.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class PaymentRequired(APIException):
    """HTTP 402 Payment Required exception.

    Raised when user has insufficient credits to submit a generation request.
    """

    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Insufficient credits to process request"
    default_code = "payment_required"

    def __init__(self, detail=None, code=None):
        if detail is not None:
            self.detail = detail
        else:
            self.detail = self.default_detail

        if code is not None:
            self.default_code = code
