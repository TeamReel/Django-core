"""Observable Celery Task base class for task lifecycle metrics (B15)."""

import time
import logging
from typing import Any
from celery import Task
from .logging import set_correlation_id
from .metrics import emit_metric

logger = logging.getLogger(__name__)


# T039-T040: ObservableTask base class
class ObservableTask(Task):
    """
    Celery Task base class with built-in observability (FR-014).
    
    Emits:
    - tasks_started_total{task_name}
    - tasks_completed_total{task_name, status}
    - task_duration_seconds{task_name}
    - task_retries_total{task_name}
    
    Usage:
        from observability.tasks import ObservableTask
        
        @shared_task(base=ObservableTask, bind=True)
        def my_task(self, arg1, arg2):
            # Task implementation
            pass
    """
    
    def __call__(self, *args, **kwargs):
        """
        Override Task.__call__() to instrument task lifecycle (T040).
        
        Wraps execution with metrics emission, exception isolation (FR-011a),
        and correlation ID extraction from request headers.
        """
        start_time = time.time()
        task_name = self.name
        status = 'unknown'
        
        try:
            # Extract correlation_id from task request headers
            correlation_id = self.request.get('correlation_id')
            if correlation_id:
                set_correlation_id(correlation_id)
            
            # FR-014: Emit tasks_started_total
            emit_metric('counter', 'tasks_started_total', 1, {'task_name': task_name})
            
            # Execute task
            result = super().__call__(*args, **kwargs)
            status = 'success'
            return result
        
        except Exception as exc:
            status = 'failure'
            raise  # Re-raise after capturing status
        
        finally:
            try:
                duration = time.time() - start_time
                
                # FR-014: Emit tasks_completed_total with status label
                emit_metric('counter', 'tasks_completed_total', 1, {
                    'task_name': task_name,
                    'status': status
                })
                
                # FR-014: Emit task_duration_seconds
                emit_metric('histogram', 'task_duration_seconds', duration, {
                    'task_name': task_name
                })
                
                # FR-014: Emit task_retries_total if task has retries
                if self.request.retries > 0:
                    emit_metric('counter', 'task_retries_total', self.request.retries, {
                        'task_name': task_name
                    })
            
            except Exception as e:
                # FR-011a: Never propagate exceptions from observability hooks
                logger.error(f"Task metrics emission failed: {e}")
