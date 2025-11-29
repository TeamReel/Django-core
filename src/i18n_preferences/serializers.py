"""Serializers for i18n preference API endpoints."""
from rest_framework import serializers
from .validators import validate_language_code, validate_locale_code, validate_timezone


class PreferenceSerializer(serializers.Serializer):
    """Serializer for i18n preference input/output."""

    language = serializers.CharField(
        max_length=10,
        required=False,
        allow_null=True,
        validators=[validate_language_code],
        help_text="ISO 639-1 language code (e.g., 'en', 'nl')",
    )
    locale = serializers.CharField(
        max_length=20,
        required=False,
        allow_null=True,
        validators=[validate_locale_code],
        help_text="BCP 47 locale code (e.g., 'en-US', 'nl-NL')",
    )
    timezone = serializers.CharField(
        max_length=50,
        required=False,
        allow_null=True,
        validators=[validate_timezone],
        help_text="IANA timezone name (e.g., 'Europe/Amsterdam')",
    )


class EffectivePreferenceSerializer(serializers.Serializer):
    """Serializer for effective preferences with source attribution."""

    language = serializers.CharField()
    locale = serializers.CharField()
    timezone = serializers.CharField()
    language_source = serializers.ChoiceField(choices=["user", "organisation", "global"])
    locale_source = serializers.ChoiceField(choices=["user", "organisation", "global"])
    timezone_source = serializers.ChoiceField(choices=["user", "organisation", "global"])
