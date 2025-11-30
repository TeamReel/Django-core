"""Custom template filters for web_ui app."""
from django import template

register = template.Library()


@register.filter
def getattribute(obj, attr):
    """
    Get attribute from object dynamically.

    Usage: {{ item|getattribute:"field_name" }}

    This enables the list_table component to access arbitrary attributes
    specified in the columns configuration.

    Example:
        columns = [{'field': 'name', 'label': 'Name'}]
        {{ item|getattribute:column.field }}  # Accesses item.name

    Args:
        obj: Object to get attribute from
        attr: String attribute name

    Returns:
        Attribute value or empty string if not found
    """
    try:
        # Try direct attribute access
        return getattr(obj, attr, '')
    except (AttributeError, TypeError):
        # Fallback for dict-like objects
        try:
            return obj[attr]
        except (KeyError, TypeError):
            return ''
