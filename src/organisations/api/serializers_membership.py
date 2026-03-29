"""
Membership serializers for organisations API.
"""

import uuid

from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Nested serializer for user details."""

    organisations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "organisations", "is_active"]
        read_only_fields = fields

    def get_organisations(self, obj):
        """Return list of organisations this user belongs to."""
        from projects.models import ProjectMembership

        orgs_data = {}

        # 1. Direct organisation memberships
        memberships = Membership.objects.filter(user=obj, is_active=True).select_related(
            "organisation"
        )
        for m in memberships:
            orgs_data[m.organisation.id] = {
                "id": str(m.organisation.id),
                "name": m.organisation.name,
                "slug": m.organisation.slug,
                "role": m.role,
            }

        # 2. Project memberships (infer organisation from project)
        project_memberships = ProjectMembership.objects.filter(user=obj).select_related(
            "project__organisation"
        )
        for pm in project_memberships:
            if pm.project and pm.project.organisation:
                org = pm.project.organisation
                if org.id not in orgs_data:
                    orgs_data[org.id] = {
                        "id": str(org.id),
                        "name": org.name,
                        "slug": org.slug,
                        "role": pm.role,
                    }

        return list(orgs_data.values())


class UserBasicSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for large list endpoints.

    Avoids expensive per-user computed fields (e.g. organisations) to prevent N+1 queries.
    """

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "is_active"]
        read_only_fields = fields


class MembershipSerializer(serializers.ModelSerializer):
    """
    Read serializer for Membership with nested user and organisation details.
    """

    user = UserSerializer(read_only=True)
    organisation = serializers.SerializerMethodField()
    invited_by = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "user",
            "organisation",
            "role",
            "joined_at",
            "invited_by",
            "is_active",
        ]
        read_only_fields = fields

    def get_organisation(self, obj):
        """Return minimal organisation details."""
        return {
            "id": str(obj.organisation.id),
            "name": obj.organisation.name,
            "slug": obj.organisation.slug,
        }


class MembershipListSerializer(serializers.ModelSerializer):
    """List serializer for memberships.

    This is intentionally lighter than MembershipSerializer to keep directory pages fast.
    """

    user = UserBasicSerializer(read_only=True)
    organisation = serializers.SerializerMethodField()
    invited_by = UserBasicSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "user",
            "organisation",
            "role",
            "joined_at",
            "invited_by",
            "is_active",
        ]
        read_only_fields = fields

    def get_organisation(self, obj):
        return {
            "id": str(obj.organisation.id),
            "name": obj.organisation.name,
            "slug": obj.organisation.slug,
        }


class MembershipUpdateSerializer(serializers.ModelSerializer):
    """
    Write serializer for updating membership role.

    Only allows updating the role field.
    """

    class Meta:
        model = Membership
        fields = ["role"]


class MembershipCreateSerializer(serializers.ModelSerializer):
    """
    Write serializer for creating memberships (inviting members).

    Validates:
    - email: Must be a valid user email
    - role: Must be 'admin' or 'member'
    - No duplicate memberships (validated in validate())
    """

    email = serializers.EmailField(write_only=True)

    class Meta:
        model = Membership
        fields = ["email", "role"]

    def validate_email(self, value):
        """Validate that user exists."""
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value

    def validate(self, attrs):
        """Validate user and organisation."""
        org_pk = self.context["view"].kwargs.get("organisation_pk")
        email = attrs["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist as e:
            raise serializers.ValidationError({"email": "User does not exist."}) from e

        attrs["user"] = user

        # Resolve organisation
        try:
            # Check if it's a UUID
            uuid.UUID(str(org_pk))
            org = Organisation.objects.get(id=org_pk)
        except (ValueError, Organisation.DoesNotExist):
            # Try as slug
            try:
                org = Organisation.objects.get(slug=org_pk)
            except Organisation.DoesNotExist as e:
                raise serializers.ValidationError("Organisation not found.") from e

        # Store org for create method
        attrs["organisation"] = org

        return attrs

    def create(self, validated_data):
        """Create or update membership with resolved user and organisation."""
        user = validated_data.pop("user")
        org = validated_data.pop("organisation")
        validated_data.pop("email", None)

        # Update existing membership or create new one
        membership, created = Membership.objects.update_or_create(
            user=user, organisation=org, defaults=validated_data
        )

        # If it was inactive (soft deleted), reactivate it
        if not created and not membership.is_active:
            membership.is_active = True
            membership.save()

        return membership
