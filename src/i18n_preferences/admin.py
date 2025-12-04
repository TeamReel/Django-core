"""Admin configuration for i18n_preferences."""

from django.contrib import admin
from django.utils.html import format_html
from settings.models import ScopeType, Setting

from .services import PreferenceResolutionService


class UserPreferenceInline(admin.StackedInline):
    """Inline admin for displaying user i18n preferences in User admin.

    Shows both stored preferences and computed effective preferences
    (considering org defaults and global fallback) for debugging.
    """

    model = Setting
    extra = 0
    can_delete = True
    verbose_name = "i18n Preference"
    verbose_name_plural = "i18n Preferences"
    fields = ("key", "value", "effective_preferences_display")
    readonly_fields = ("key", "effective_preferences_display")

    def get_queryset(self, request):
        """Filter to show only i18n.preferences settings for this user."""
        qs = super().get_queryset(request)
        return qs.filter(key="i18n.preferences", scope_type=ScopeType.USER)

    def effective_preferences_display(self, obj):
        """Display computed effective preferences with source attribution.

        Shows the actual preferences that will be used by the application
        after precedence resolution (user > org > global).
        """
        if not obj.user:
            return format_html("<em>No user associated</em>")

        try:
            # Get effective preferences with source attribution
            prefs = PreferenceResolutionService.get_effective_preferences(
                user=obj.user, organisation=getattr(obj.user, "organisation", None)
            )

            return format_html(
                "<div style='font-family: monospace; font-size: 12px;'>"
                "<strong>Effective Preferences:</strong><br><br>"
                "<strong>Language:</strong> {} <em>(from {})</em><br>"
                "<strong>Locale:</strong> {} <em>(from {})</em><br>"
                "<strong>Timezone:</strong> {} <em>(from {})</em>"
                "</div>",
                prefs.language,
                prefs.language_source,
                prefs.locale,
                prefs.locale_source,
                prefs.timezone,
                prefs.timezone_source,
            )
        except Exception as e:
            return format_html(
                '<span style="color: red;">Error computing preferences: {}</span>',
                str(e),
            )

    effective_preferences_display.short_description = "Effective Preferences (After Resolution)"


# Admin customization to be added to User admin via accounts app
# Example usage in accounts/admin.py:
#
# from i18n_preferences.admin import UserPreferenceInline
#
# class UserAdmin(admin.ModelAdmin):
#     inlines = [UserPreferenceInline]
