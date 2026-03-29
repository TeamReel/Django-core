"""
Example: Audited task for user data export.

Demonstrates proper use of AuditedTask base class with B09 audit integration.
"""

from celery import shared_task
from tasks.base import AuditedTask


@shared_task(base=AuditedTask, name="tasks.examples.export_user_data")
def export_user_data(user_id, org_id, export_format="csv", request_id=None):
    """
    Export user data with automatic audit logging.

    This task uses AuditedTask because:
    - Exports sensitive user data
    - GDPR requires audit trail for data exports
    - Compliance investigations need to track who exported what data

    Args:
        user_id (int): Required - ID of user whose data is being exported
        org_id (int): Required - Organisation ID for multi-tenancy
        export_format (str): Export format ('csv', 'json', 'xml')
        request_id (str): Optional - Request ID for distributed tracing

    Returns:
        dict: Status information about the export

    Example:
        >>> from tasks.examples.export_user_data import export_user_data
        >>> result = export_user_data.delay(
        ...     user_id=123,
        ...     org_id=456,
        ...     export_format='csv',
        ...     request_id='req-789'
        ... )
        >>> result.id
        'abc-123-def-456'

    Audit Events Created:
        - task.started: When export begins
        - task.completed: When export succeeds
        - task.failed: If export fails after retries
    """
    # In real implementation, this would:
    # 1. Fetch user data from database
    # 2. Format according to requested format
    # 3. Upload to S3 or similar
    # 4. Return download URL

    # For example purposes, we'll just return mock data
    return {
        "status": "completed",
        "user_id": user_id,
        "org_id": org_id,
        "format": export_format,
        "request_id": request_id,
        "message": "User data export completed successfully",
    }
