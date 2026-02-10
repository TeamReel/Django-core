"""Factory Boy factories for workflows app tests."""
import factory
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from factory.django import DjangoModelFactory

from src.workflows.models import (
    ProjectPermissionOverride,
    TransitionHistory,
    WorkflowInstance,
    WorkflowTemplate,
)

User = get_user_model()


class WorkflowTemplateFactory(DjangoModelFactory):
    """Factory for WorkflowTemplate model with realistic workflow definition."""

    class Meta:
        model = WorkflowTemplate

    name = factory.Sequence(lambda n: f"Workflow Template {n}")
    description = factory.Faker("paragraph")
    version = "1.0.0"
    definition = factory.LazyFunction(
        lambda: {
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {"name": "in_progress", "is_initial": False, "is_terminal": False},
                {"name": "completed", "is_initial": False, "is_terminal": True},
            ],
            "transitions": [
                {
                    "action": "start",
                    "from_state": "draft",
                    "to_state": "in_progress",
                    "validators": [],
                    "hooks": [],
                },
                {
                    "action": "complete",
                    "from_state": "in_progress",
                    "to_state": "completed",
                    "validators": ["validate_completion"],
                    "hooks": ["notify_completion"],
                },
            ],
        }
    )
    is_active = True


class WorkflowInstanceFactory(DjangoModelFactory):
    """Factory for WorkflowInstance model."""

    class Meta:
        model = WorkflowInstance

    workflow = factory.SubFactory(WorkflowTemplateFactory)
    workflow_snapshot = factory.LazyAttribute(lambda obj: obj.workflow.definition)
    project = factory.LazyFunction(
        lambda: __import__("tests.workflows.conftest", fromlist=["project"]).project()
    )
    content_type = factory.LazyFunction(lambda: ContentType.objects.get_for_model(User))
    object_id = factory.Sequence(lambda n: n)
    current_state = "draft"
    context = factory.LazyFunction(lambda: {"step": 1, "notes": "Test context"})
    version = 0
    created_by = factory.SubFactory("tests.workflows.factories.UserFactory")  # Lazy reference


class TransitionHistoryFactory(DjangoModelFactory):
    """Factory for TransitionHistory model."""

    class Meta:
        model = TransitionHistory

    instance = factory.SubFactory(WorkflowInstanceFactory)
    from_state = "draft"
    to_state = "in_progress"
    action = "start"
    actor = factory.SubFactory("tests.workflows.factories.UserFactory")
    comment = factory.Faker("sentence")
    context_snapshot = factory.LazyAttribute(lambda obj: obj.instance.context)


class ProjectPermissionOverrideFactory(DjangoModelFactory):
    """Factory for ProjectPermissionOverride model."""

    class Meta:
        model = ProjectPermissionOverride

    project = factory.LazyFunction(
        lambda: __import__("tests.workflows.conftest", fromlist=["project"]).project()
    )
    workflow = factory.SubFactory(WorkflowTemplateFactory)
    action_name = "start"
    required_roles = factory.LazyFunction(lambda: ["admin", "coach"])


class UserFactory(DjangoModelFactory):
    """Factory for User model."""

    class Meta:
        model = User

    email = factory.Faker("email")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
