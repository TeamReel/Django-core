"""DRF serializers for transactions API."""

from decimal import Decimal

from rest_framework import serializers

from transactions.models import BalancePolicy, SourceTypeChoices, Transaction, UsageEvent


class UsageEventSerializer(serializers.ModelSerializer):
    """Serializer for UsageEvent model."""

    organization_id = serializers.UUIDField(write_only=True, required=True)
    project_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    user_id = serializers.UUIDField(write_only=True, required=True)

    class Meta:
        """Serializer metadata."""

        model = UsageEvent
        fields = [
            "id",
            "event_type",
            "user_id",
            "organization_id",
            "project_id",
            "metadata",
            "timestamp",
            "idempotency_key",
            "created_at",
        ]
        read_only_fields = ["id", "timestamp", "created_at"]

    def validate_event_type(self, value: str) -> str:
        """Validate event_type is non-empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("event_type cannot be empty")
        return value.strip()

    def validate_organization_id(self, value):
        """Validate organization exists."""
        from organisations.models import Organisation

        if not Organisation.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"Organisation with ID {value} does not exist")
        return value

    def validate_project_id(self, value):
        """Validate project exists."""
        if value is None:
            return value

        from projects.models import Project

        if not Project.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"Project with ID {value} does not exist")
        return value

    def validate_user_id(self, value):
        """Validate user exists."""
        from accounts.models import User

        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"User with ID {value} does not exist")
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        organization_id = attrs.get("organization_id")
        project_id = attrs.get("project_id")

        # If project provided, verify it belongs to the organization
        if project_id:
            from projects.models import Project

            try:
                project = Project.objects.get(id=project_id)
                if str(project.organisation_id) != str(organization_id):
                    raise serializers.ValidationError(
                        {
                            "project_id": f"Project {project_id} does not belong to organization {organization_id}"
                        }
                    )
            except Project.DoesNotExist:
                raise serializers.ValidationError({"project_id": f"Project {project_id} does not exist"})

        return attrs

    def create(self, validated_data):
        """Create UsageEvent instance."""
        from accounts.models import User
        from organisations.models import Organisation
        from projects.models import Project

        # Extract IDs and fetch actual instances
        organization_id = validated_data.pop("organization_id")
        project_id = validated_data.pop("project_id", None)
        user_id = validated_data.pop("user_id")

        validated_data["organization"] = Organisation.objects.get(id=organization_id)
        validated_data["user"] = User.objects.get(id=user_id)

        if project_id:
            validated_data["project"] = Project.objects.get(id=project_id)

        return super().create(validated_data)


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model."""

    organization_id = serializers.UUIDField(write_only=True, required=True)
    project_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    created_by_id = serializers.UUIDField(write_only=True, required=True)
    usage_event_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    # Read-only display fields
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, allow_null=True)

    class Meta:
        """Serializer metadata."""

        model = Transaction
        fields = [
            "id",
            "amount",
            "organization_id",
            "organization_name",
            "project_id",
            "project_name",
            "source_type",
            "usage_event_id",
            "external_reference_id",
            "timestamp",
            "created_by_id",
            "created_by_email",
            "idempotency_key",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "timestamp", "created_at", "created_by_email", "organization_name", "project_name"]

    def validate_amount(self, value: Decimal) -> Decimal:
        """Validate amount is non-zero and within precision limits."""
        if value == Decimal("0"):
            raise serializers.ValidationError("amount cannot be zero")

        # Check max_digits=14, decimal_places=4
        if value.as_tuple().exponent < -4:
            raise serializers.ValidationError("amount cannot have more than 4 decimal places")

        # Check total digits (14)
        str_amount = str(abs(value)).replace(".", "")
        if len(str_amount) > 14:
            raise serializers.ValidationError("amount cannot have more than 14 total digits")

        return value

    def validate_idempotency_key(self, value: str) -> str:
        """Validate idempotency_key is non-empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("idempotency_key is required and cannot be empty")
        return value.strip()

    def validate_organization_id(self, value):
        """Validate organization exists."""
        from organisations.models import Organisation

        if not Organisation.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"Organisation with ID {value} does not exist")
        return value

    def validate_project_id(self, value):
        """Validate project exists."""
        if value is None:
            return value

        from projects.models import Project

        if not Project.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"Project with ID {value} does not exist")
        return value

    def validate_created_by_id(self, value):
        """Validate user exists."""
        from accounts.models import User

        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"User with ID {value} does not exist")
        return value

    def validate_usage_event_id(self, value):
        """Validate usage event exists."""
        if value is None:
            return value

        if not UsageEvent.objects.filter(id=value).exists():
            raise serializers.ValidationError(f"UsageEvent with ID {value} does not exist")
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        organization_id = attrs.get("organization_id")
        project_id = attrs.get("project_id")
        source_type = attrs.get("source_type")
        usage_event_id = attrs.get("usage_event_id")

        # If project provided, verify it belongs to the organization
        if project_id:
            from projects.models import Project

            try:
                project = Project.objects.get(id=project_id)
                if str(project.organisation_id) != str(organization_id):
                    raise serializers.ValidationError(
                        {
                            "project_id": f"Project {project_id} does not belong to organization {organization_id}"
                        }
                    )
            except Project.DoesNotExist:
                raise serializers.ValidationError({"project_id": f"Project {project_id} does not exist"})

        # If source_type is USAGE_EVENT, usage_event_id is required
        if source_type == SourceTypeChoices.USAGE_EVENT and not usage_event_id:
            raise serializers.ValidationError(
                {"usage_event_id": "usage_event_id is required when source_type is usage_event"}
            )

        return attrs

    def create(self, validated_data):
        """Create Transaction via service layer (handles policy enforcement)."""
        from accounts.models import User
        from organisations.models import Organisation
        from projects.models import Project

        from transactions.services import create_transaction

        # Extract IDs and fetch actual instances
        organization_id = validated_data.pop("organization_id")
        project_id = validated_data.pop("project_id", None)
        created_by_id = validated_data.pop("created_by_id")
        usage_event_id = validated_data.pop("usage_event_id", None)

        organization = Organisation.objects.get(id=organization_id)
        created_by = User.objects.get(id=created_by_id)

        project = None
        if project_id:
            project = Project.objects.get(id=project_id)

        usage_event = None
        if usage_event_id:
            usage_event = UsageEvent.objects.get(id=usage_event_id)

        # Call service layer (raises InsufficientBalanceError, PolicyViolationError, DuplicateIdempotencyKeyError)
        return create_transaction(
            organization=organization,
            amount=validated_data["amount"],
            source_type=validated_data["source_type"],
            created_by=created_by,
            idempotency_key=validated_data["idempotency_key"],
            project=project,
            usage_event=usage_event,
            external_reference_id=validated_data.get("external_reference_id"),
            notes=validated_data.get("notes", ""),
        )


class BalanceSerializer(serializers.Serializer):
    """Read-only serializer for computed balance data."""

    organization_id = serializers.UUIDField(required=False, allow_null=True)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    balance = serializers.DecimalField(max_digits=14, decimal_places=4)
    transaction_count = serializers.IntegerField()
    last_transaction_timestamp = serializers.DateTimeField(allow_null=True)

    def to_representation(self, instance):
        """Convert dict to representation."""
        # instance is a dict from service layer
        return {
            "organization_id": instance.get("organization_id"),
            "project_id": instance.get("project_id"),
            "balance": instance["balance"],
            "transaction_count": instance["transaction_count"],
            "last_transaction_timestamp": instance.get("last_transaction_timestamp"),
        }


class BalancePolicySerializer(serializers.ModelSerializer):
    """Serializer for BalancePolicy model."""

    organization_id = serializers.UUIDField(source="organization.id", read_only=True)
    project_id = serializers.UUIDField(source="project.id", read_only=True, allow_null=True)

    class Meta:
        """Serializer metadata."""

        model = BalancePolicy
        fields = [
            "id",
            "organization_id",
            "project_id",
            "allow_negative",
            "warn_threshold",
            "enforcement_mode",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization_id", "project_id", "created_at", "updated_at"]

    def validate_warn_threshold(self, value):
        """Validate warn_threshold if provided."""
        if value is not None and value < Decimal("0"):
            raise serializers.ValidationError("warn_threshold cannot be negative")
        return value
