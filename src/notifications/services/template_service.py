"""Email template rendering service."""

from typing import Any, Dict

from django.template.loader import render_to_string


class TemplateService:
    """Service for rendering email templates with variable substitution."""

    def render_email(self, notification_type_code: str, context: Dict[str, Any]) -> Dict[str, str]:
        """Render email templates for given notification type.

        Args:
            notification_type_code: NotificationType.code (e.g., 'default')
            context: Template context dict with variables like 'subject', 'body', etc.

        Returns:
            Dict with:
                - subject: Rendered email subject line
                - body_html: Rendered HTML email body
                - body_text: Rendered plain text email body

        Raises:
            TemplateDoesNotExist: If templates for notification_type_code not found
        """
        template_base = f"notifications/email/{notification_type_code}"

        subject = render_to_string(f"{template_base}_subject.txt", context).strip()
        body_html = render_to_string(f"{template_base}_body.html", context)
        body_text = render_to_string(f"{template_base}_body.txt", context)

        return {
            "subject": subject,
            "body_html": body_html,
            "body_text": body_text,
        }
