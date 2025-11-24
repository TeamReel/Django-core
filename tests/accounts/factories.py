"""Factory classes for creating test data."""

import factory
from accounts.models import User
from django.contrib.auth.models import Group
from factory.django import DjangoModelFactory


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@test.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = False
    email_verified = False

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password after user creation."""
        if not create:
            return
        if extracted:
            self.set_password(extracted)
        else:
            self.set_password("Test123!@#")

    @factory.post_generation
    def groups(self, create, extracted, **kwargs):
        """Add groups after user creation."""
        if not create:
            return
        if extracted:
            for group in extracted:
                self.groups.add(group)


class VerifiedUserFactory(UserFactory):
    """Factory for creating verified users."""

    is_active = True
    email_verified = True

    @factory.post_generation
    def groups(self, create, extracted, **kwargs):
        """Add to user group by default."""
        if not create:
            return
        user_group, _ = Group.objects.get_or_create(name="user")
        self.groups.add(user_group)
        if extracted:
            for group in extracted:
                self.groups.add(group)


class AdminUserFactory(UserFactory):
    """Factory for creating admin users."""

    is_active = True
    email_verified = True
    is_staff = True

    @factory.post_generation
    def groups(self, create, extracted, **kwargs):
        """Add to admin group by default."""
        if not create:
            return
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.groups.add(admin_group)
        if extracted:
            for group in extracted:
                self.groups.add(group)


class SuperadminUserFactory(UserFactory):
    """Factory for creating superadmin users."""

    is_active = True
    email_verified = True
    is_staff = True
    is_superuser = True

    @factory.post_generation
    def groups(self, create, extracted, **kwargs):
        """Add to superadmin group by default."""
        if not create:
            return
        superadmin_group, _ = Group.objects.get_or_create(name="superadmin")
        self.groups.add(superadmin_group)
        if extracted:
            for group in extracted:
                self.groups.add(group)
