"""
Audit system signals.

Signals allow downstream applications to react to audit system events
without tight coupling.
"""

import django.dispatch

# Signal: audit_record_failed
# Sent when audit_log.record() fails to persist an event
#
# Arguments:
#   sender: AuditLog class
#   event_type: str - The event type that failed to record
#   exception: Exception - The exception that occurred
#   event_data: dict - The event data that failed to persist
#
# Example handler:
#   from audit.signals import audit_record_failed
#   from django.dispatch import receiver
#
#   @receiver(audit_record_failed)
#   def handle_audit_failure(sender, event_type, exception, event_data, **kwargs):
#       # Alert ops team, log to external system, etc.
#       pass
#
audit_record_failed = django.dispatch.Signal()
