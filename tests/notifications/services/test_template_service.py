"""Unit tests for TemplateService."""

import pytest
from django.template import TemplateDoesNotExist
from notifications.services.template_service import TemplateService


class TestTemplateService:
    """Test email template rendering."""

    def test_render_email_default_templates(self):
        """Default templates render with context variables."""
        service = TemplateService()

        context = {
            "subject": "Welcome to our platform",
            "body": "<p>Thank you for signing up!</p>",
        }

        result = service.render_email("default", context)

        assert "subject" in result
        assert "body_html" in result
        assert "body_text" in result

        # Verify subject is stripped of whitespace
        assert result["subject"] == "Welcome to our platform"

        # Verify HTML body contains styled content
        assert "<p>Thank you for signing up!</p>" in result["body_html"]
        assert "font-family: Arial" in result["body_html"]
        assert "max-width: 600px" in result["body_html"]

        # Verify text body contains plain content (HTML tags should be present from context)
        assert "<p>Thank you for signing up!</p>" in result["body_text"]

    def test_render_email_with_safe_html(self):
        """HTML in body context variable is marked safe in HTML template."""
        service = TemplateService()

        context = {
            "subject": "Test",
            "body": "<strong>Bold text</strong> and <em>italic</em>",
        }

        result = service.render_email("default", context)

        # HTML should be rendered without escaping in HTML template
        assert "<strong>Bold text</strong>" in result["body_html"]
        assert "<em>italic</em>" in result["body_html"]

    def test_render_email_missing_templates(self):
        """Non-existent template raises TemplateDoesNotExist."""
        service = TemplateService()

        context = {"subject": "Test", "body": "Body"}

        with pytest.raises(TemplateDoesNotExist):
            service.render_email("nonexistent_type", context)

    def test_render_email_with_additional_context(self):
        """Templates can use additional context variables."""
        service = TemplateService()

        context = {
            "subject": "Order Confirmation",
            "body": "Your order has been confirmed.",
            "order_id": "12345",
            "total": "$99.99",
        }

        result = service.render_email("default", context)

        # Basic context still works
        assert result["subject"] == "Order Confirmation"
        assert "Your order has been confirmed" in result["body_text"]

    def test_render_email_empty_context(self):
        """Empty context produces empty rendered output."""
        service = TemplateService()

        context = {"subject": "", "body": ""}

        result = service.render_email("default", context)

        assert result["subject"] == ""
        assert result["body_text"].strip() == ""
