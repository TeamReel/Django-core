"""Workflow engine Celery tasks for async hook execution."""
import logging
from typing import Any

from celery import shared_task

from src.workflows.models import WorkflowInstance

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def execute_workflow_hooks(
    self, instance_id: int, hook_type: str, hook_keys: list[str]
) -> dict[str, Any]:
    """
    Execute workflow hooks asynchronously.

    Args:
        instance_id: WorkflowInstance ID
        hook_type: Hook type (on_exit, on_transition, on_enter)
        hook_keys: List of hook keys (state names or action names)

    Returns:
        Dict with execution results

    Raises:
        Retry on transient failures
    """
    try:
        instance = WorkflowInstance.objects.select_related("workflow", "project").get(
            id=instance_id
        )

        # Import registries
        from src.workflows.registry import hook_registry

        results = []
        for key in hook_keys:
            hooks = hook_registry.get_hooks(hook_type, key)

            for hook in hooks:
                try:
                    hook(instance, {})  # Transition dict not available in async context
                    results.append({"key": key, "hook": hook.__name__, "status": "success"})
                except Exception as e:
                    logger.error(
                        f"Async hook {hook_type}/{key} failed",
                        extra={
                            "instance_id": instance_id,
                            "hook": hook.__name__,
                            "error": str(e),
                        },
                    )
                    results.append(
                        {
                            "key": key,
                            "hook": hook.__name__,
                            "status": "failed",
                            "error": str(e),
                        }
                    )

        logger.info(
            "Completed async workflow hooks",
            extra={
                "instance_id": instance_id,
                "hook_type": hook_type,
                "results": results,
            },
        )

        return {
            "instance_id": instance_id,
            "hook_type": hook_type,
            "results": results,
            "task_id": str(self.request.id),
        }

    except WorkflowInstance.DoesNotExist:
        logger.error(f"WorkflowInstance {instance_id} not found")
        raise  # Don't retry on permanent errors

    except Exception as e:
        logger.warning(
            "Transient error executing workflow hooks",
            extra={"instance_id": instance_id, "error": str(e), "retry": self.request.retries},
        )
        raise self.retry(exc=e, countdown=2**self.request.retries) from e  # Exponential backoff
