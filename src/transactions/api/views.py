"""DRF views for transactions API."""

import csv
from io import StringIO

from django.core.exceptions import PermissionDenied
from django.http import StreamingHttpResponse
from django.urls import reverse
from django_filters.rest_framework import DjangoFilterBackend
from permissions.api.permissions import HasOrganizationPermission, HasProjectPermission
from permissions.audit import evaluate_permission
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from transactions.exceptions import (
    DuplicateIdempotencyKeyError,
    InsufficientBalanceError,
    PolicyViolationError,
)
from transactions.models import BalancePolicy, Transaction, UsageEvent
from transactions.services import (
    get_organization_balance,
    get_policy,
    get_project_balance,
    get_user_balance,
)

from .filters import TransactionFilter, UsageEventFilter
from .serializers import (
    BalancePolicySerializer,
    BalanceSerializer,
    EffectiveBalancePolicySerializer,
    TransactionSerializer,
    UsageEventSerializer,
)


class TransactionsApiRootCompatView(APIView):
    """Compatibility view for GET /api/v1/transactions/.

    Some clients mistakenly call the transactions API root (router index) with
    filter params like ?project_id=... expecting a transaction list.

    Behavior:
    - If query params look like list filters/pagination, delegate to
      TransactionViewSet.list.
    - Otherwise, return the same link-index payload as the router root.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        interesting_params = {
            "organization_id",
            "project_id",
            "charged_user_id",
            "season_id",
            "period_id",
            "activity_id",
            "source_type",
            "start_date",
            "end_date",
            "timestamp__gte",
            "timestamp__lte",
            "ordering",
            "page",
            "page_size",
            "export",
        }

        if any(k in request.query_params for k in interesting_params):
            list_view = TransactionViewSet.as_view({"get": "list"})
            return list_view(request._request)  # type: ignore[attr-defined]

        links = {
            "usage-events": request.build_absolute_uri(reverse("usage-event-list")),
            "transactions": request.build_absolute_uri(reverse("transaction-list")),
            "balance-policies": request.build_absolute_uri(reverse("balance-policy-list")),
        }
        return Response(links)


class UsageEventViewSet(viewsets.ModelViewSet):
    """ViewSet for UsageEvent model.

    Endpoints:
    - POST /usage-events/ - Create usage event
    - GET /usage-events/ - List usage events (filterable)
    """

    queryset = UsageEvent.objects.select_related("user", "organization", "project").all()
    serializer_class = UsageEventSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = UsageEventFilter
    http_method_names = ["get", "post"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Org-scoped queryset: only return usage events for user's organisations."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        user_org_ids = user.organisation_memberships.values_list("organisation_id", flat=True)
        return qs.filter(organization__in=user_org_ids)

    def create(self, request: Request, *args, **kwargs) -> Response:
        """Create usage event with idempotency support."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check for duplicate idempotency key
        idempotency_key = serializer.validated_data.get("idempotency_key")
        if idempotency_key:
            existing = UsageEvent.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                # Return existing event with 409 status
                return Response(
                    UsageEventSerializer(existing).data,
                    status=status.HTTP_409_CONFLICT,
                )

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for Transaction model.

    Endpoints:
    - POST /transactions/ - Create transaction (with policy enforcement)
    - GET /transactions/ - List transactions (filterable, CSV export)
    """

    queryset = Transaction.objects.select_related(
        "organization", "project", "created_by", "usage_event", "charged_user"
    )
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TransactionFilter
    http_method_names = ["get", "post"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Org-scoped queryset: only return transactions for user's organisations."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        user_org_ids = user.organisation_memberships.values_list("organisation_id", flat=True)
        return qs.filter(organization__in=user_org_ids)

    def create(self, request: Request, *args, **kwargs) -> Response:
        """Create transaction via service layer with policy enforcement."""
        # Check for duplicate idempotency key BEFORE validation
        idempotency_key = request.data.get("idempotency_key")
        if idempotency_key:
            existing_txn = Transaction.objects.filter(idempotency_key=idempotency_key).first()
            if existing_txn:
                return Response(
                    {
                        "error": "duplicate_idempotency_key",
                        "existing_transaction_id": str(existing_txn.id),
                        "message": (
                            f"Transaction with idempotency key "
                            f"'{idempotency_key}' already exists"
                        ),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            transaction = serializer.save()
            return Response(
                TransactionSerializer(transaction).data,
                status=status.HTTP_201_CREATED,
            )
        except DuplicateIdempotencyKeyError as e:
            # Fallback if race condition occurs
            return Response(
                {
                    "error": "duplicate_idempotency_key",
                    "existing_transaction_id": str(e),
                    "message": f"Transaction with idempotency key already exists: {e}",
                },
                status=status.HTTP_409_CONFLICT,
            )
        except InsufficientBalanceError as e:
            # Return 403 with detailed error
            return Response(
                {
                    "error": "insufficient_balance",
                    "current_balance": str(e.current_balance),
                    "requested_amount": str(e.requested_amount),
                    "policy": str(e.policy),
                    "message": str(e),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except PolicyViolationError as e:
            # Non-blocking policy violation (warn mode)
            return Response(
                {
                    "error": "policy_violation",
                    "current_balance": str(e.current_balance),
                    "requested_amount": str(e.requested_amount),
                    "policy": str(e.policy),
                    "message": str(e),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    def list(self, request: Request, *args, **kwargs) -> Response:
        """List transactions with optional CSV export."""
        # Check for CSV export (use 'export' param to avoid DRF format suffix conflict)
        export_format = request.query_params.get("export")

        if export_format == "csv":
            return self._export_csv(request)

        return super().list(request, *args, **kwargs)

    def _export_csv(self, request: Request) -> StreamingHttpResponse:
        """Export transactions as CSV."""
        queryset = self.filter_queryset(self.get_queryset())

        def csv_generator():
            """Generator for streaming CSV rows."""
            output = StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow(
                [
                    "transaction_id",
                    "organization_id",
                    "project_id",
                    "amount",
                    "source_type",
                    "timestamp",
                    "created_by_email",
                    "notes",
                ]
            )
            yield output.getvalue()
            output.truncate(0)
            output.seek(0)

            # Write data rows
            for txn in queryset.iterator(chunk_size=500):
                writer.writerow(
                    [
                        str(txn.id),
                        str(txn.organization_id),
                        str(txn.project_id) if txn.project_id else "",
                        str(txn.amount),
                        txn.source_type,
                        txn.timestamp.isoformat(),
                        txn.created_by.email,
                        txn.notes,
                    ]
                )
                yield output.getvalue()
                output.truncate(0)
                output.seek(0)

        response = StreamingHttpResponse(csv_generator(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="transactions.csv"'
        return response


class OrganizationBalanceView(APIView):
    """View for querying organization balance.

    Endpoint: GET /organizations/{organization_id}/balance/
    """

    permission_classes = [HasOrganizationPermission]
    required_permission = "organization.view_balance"

    def get(self, request: Request, organization_id: str) -> Response:
        """Get organization balance with aggregate stats."""
        from organisations.models import Organisation

        try:
            organization = Organisation.objects.get(id=organization_id)
        except Organisation.DoesNotExist:
            return Response(
                {"error": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Permission check automatically enforced by DRF + HasOrganizationPermission

        # Compute balance via service layer (uses cache)
        balance_data = get_organization_balance(organization.id)
        balance_data["organization_id"] = organization.id  # Add org ID for serializer

        serializer = BalanceSerializer(balance_data)
        return Response(serializer.data)


class ProjectBalanceView(APIView):
    """View for querying project balance.

    Endpoint: GET /projects/{project_id}/balance/
    """

    permission_classes = [HasProjectPermission]
    required_permission = "project.view_balance"

    def get(self, request: Request, project_id: int) -> Response:  # project_id is integer
        """Get project balance with aggregate stats."""
        from projects.models import Project

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Permission check automatically enforced by DRF + HasProjectPermission

        # Compute balance via service layer (uses cache)
        balance_data = get_project_balance(project.id)
        balance_data["project_id"] = project.id  # Add project ID for serializer

        serializer = BalanceSerializer(balance_data)
        return Response(serializer.data)


class MyUserBalanceView(APIView):
    """Authenticated user's wallet balance within an organisation.

    Endpoint: GET /organizations/{organization_id}/balance/me/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, organization_id: str) -> Response:
        from organisations.models import Organisation

        try:
            organization = Organisation.objects.get(id=organization_id)
        except Organisation.DoesNotExist:
            return Response(
                {"error": "Organization not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        balance_data = get_user_balance(
            organization_id=organization.id,
            user_id=request.user.id,
        )
        balance_data["organization_id"] = organization.id
        balance_data["user_id"] = request.user.id

        serializer = BalanceSerializer(balance_data)
        return Response(serializer.data)


class BalancePolicyViewSet(viewsets.ModelViewSet):
    """ViewSet for BalancePolicy model.

    Endpoints:
    - GET /balance-policies/ - List policies
    - GET /balance-policies/{scope_type}/{scope_id}/ - Get policy for org/project
    - PATCH /balance-policies/{id}/ - Update policy
    """

    queryset = BalancePolicy.objects.select_related("organization", "project")
    serializer_class = BalancePolicySerializer
    http_method_names = ["get", "patch", "put"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Org-scoped queryset: only return balance policies for user's organisations."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return qs
        user_org_ids = user.organisation_memberships.values_list("organisation_id", flat=True)
        return qs.filter(organization__in=user_org_ids)

    @action(
        detail=False,
        methods=["get", "patch", "put"],
        url_path=r"(?P<scope_type>organization|project)/(?P<scope_id>[^/.]+)",
    )
    def get_by_scope(self, request: Request, scope_type: str, scope_id: str) -> Response:
        """Get policy by scope type and ID.

        URL: GET /balance-policies/organization/{org_id}/
        URL: GET /balance-policies/project/{proj_id}/

        Writes (upsert):
        URL: PATCH /balance-policies/organization/{org_id}/
        URL: PATCH /balance-policies/project/{proj_id}/
        """
        from organisations.models import Organisation
        from projects.models import Project

        def _require_org_manage_settings(org_id: str) -> None:
            if not request.user or not request.user.is_authenticated:
                raise PermissionDenied("Authentication required")

            if request.user.is_superuser:
                return

            allowed = evaluate_permission(
                user=request.user,
                permission="org.manage_settings",
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": str(org_id),
                },
            )
            if not allowed:
                raise PermissionDenied("You do not have access to balance policy settings")

        if scope_type == "organization":
            try:
                organization = Organisation.objects.get(id=scope_id)
            except Organisation.DoesNotExist:
                return Response(
                    {"error": "Organization not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # GET: return effective policy (may be unsaved default)
            if request.method == "GET":
                policy = get_policy(organization=organization)
                serializer = self.get_serializer(policy)
                return Response(serializer.data)

            # PATCH/PUT: upsert org-scoped policy row (requires org.manage_settings)
            _require_org_manage_settings(str(organization.id))

            instance = BalancePolicy.objects.filter(
                organization=organization, project__isnull=True
            ).first() or BalancePolicy(organization=organization, project=None)

            serializer = self.get_serializer(
                instance,
                data=request.data,
                partial=(request.method == "PATCH"),
            )
            serializer.is_valid(raise_exception=True)
            policy = serializer.save()
            return Response(self.get_serializer(policy).data)

        elif scope_type == "project":
            try:
                project = Project.objects.get(id=scope_id)
            except Project.DoesNotExist:
                return Response(
                    {"error": "Project not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # GET: return effective policy (may be unsaved default)
            if request.method == "GET":
                policy = get_policy(organization=project.organisation, project=project)
                serializer = self.get_serializer(policy)
                return Response(serializer.data)

            # PATCH/PUT: upsert project-scoped policy row (requires org.manage_settings)
            _require_org_manage_settings(str(project.organisation_id))

            instance = BalancePolicy.objects.filter(
                organization=project.organisation, project=project
            ).first() or BalancePolicy(organization=project.organisation, project=project)

            serializer = self.get_serializer(
                instance,
                data=request.data,
                partial=(request.method == "PATCH"),
            )
            serializer.is_valid(raise_exception=True)
            policy = serializer.save()
            return Response(self.get_serializer(policy).data)

        return Response(
            {"error": "Invalid scope_type. Must be 'organization' or 'project'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=["get"], url_path=r"effective")
    def effective(self, request: Request) -> Response:
        """Return the effective BalancePolicy for an org/project context.

        Query params:
        - organization_id (or org_id): UUID (optional if project_id provided)
        - project_id: int (optional)

        Resolution (Option B): project override -> org policy -> default.
        """

        from organisations.models import Organisation
        from projects.models import Project

        org_id = request.query_params.get("organization_id") or request.query_params.get("org_id")
        project_id = request.query_params.get("project_id")

        organization = None
        project = None

        if project_id is not None and str(project_id).strip() != "":
            try:
                project = Project.objects.select_related("organisation").get(id=int(project_id))
            except (ValueError, TypeError):
                return Response({"error": "Invalid project_id"}, status=status.HTTP_400_BAD_REQUEST)
            except Project.DoesNotExist:
                return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

            organization = project.organisation

        if org_id:
            try:
                organization = Organisation.objects.get(id=org_id)
            except Organisation.DoesNotExist:
                return Response(
                    {"error": "Organization not found"}, status=status.HTTP_404_NOT_FOUND
                )

        if organization is None:
            return Response(
                {"error": "Provide organization_id (or project_id)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if project is not None and str(project.organisation_id) != str(organization.id):
            return Response(
                {"error": "Project does not belong to organization"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source = "default"
        if (
            project is not None
            and BalancePolicy.objects.filter(organization=organization, project=project).exists()
        ):
            source = "project"
        elif BalancePolicy.objects.filter(organization=organization, project__isnull=True).exists():
            source = "organization"

        policy = get_policy(organization=organization, project=project)

        payload = {
            "source": source,
            "policy": BalancePolicySerializer(policy, context=self.get_serializer_context()).data,
        }
        serializer = EffectiveBalancePolicySerializer(payload)
        return Response(serializer.data)


class HealthCheckView(APIView):
    """Health check endpoint for transactions service.

    Validates:
    - Database connection (query count)
    - Redis cache connection (get/set test)
    - Balance calculation (sample org)

    Returns:
    - 200 OK if all checks pass
    - 503 Service Unavailable if any check fails
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        """Run health checks."""
        from django.core.cache import cache
        from django.db import connection

        checks = {
            "database": False,
            "cache": False,
            "balance_calculation": False,
        }
        errors = []

        # Check 1: Database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                if result and result[0] == 1:
                    checks["database"] = True
                else:
                    errors.append("Database query returned unexpected result")
        except Exception as e:
            errors.append(f"Database connection failed: {str(e)}")

        # Check 2: Redis cache connection
        try:
            test_key = "health_check:transactions:test"
            test_value = "ok"
            cache.set(test_key, test_value, timeout=10)
            retrieved = cache.get(test_key)
            if retrieved == test_value:
                checks["cache"] = True
                cache.delete(test_key)
            else:
                errors.append("Cache get/set test failed: value mismatch")
        except Exception as e:
            errors.append(f"Cache connection failed: {str(e)}")

        # Check 3: Balance calculation (sample org)
        # This is optional - only run if database is healthy
        if checks["database"]:
            try:
                from organisations.models import Organisation

                # Get first org (if any exist)
                sample_org = Organisation.objects.first()
                if sample_org:
                    balance = get_organization_balance(sample_org.id, use_cache=False)
                    if "current_balance" in balance:
                        checks["balance_calculation"] = True
                    else:
                        errors.append("Balance calculation returned invalid data")
                else:
                    # No orgs exist yet - mark as passed
                    checks["balance_calculation"] = True
            except Exception as e:
                errors.append(f"Balance calculation failed: {str(e)}")

        # Determine overall health
        all_healthy = all(checks.values())

        response_data = {
            "status": "healthy" if all_healthy else "unhealthy",
            "checks": checks,
        }

        if errors:
            response_data["errors"] = errors

        response_status = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(response_data, status=response_status)
