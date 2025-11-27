"""Python query API for feature flags and settings."""

from typing import Any, Optional, Union
from uuid import UUID

from .models import FeatureFlag, ScopeType, Setting


def _resolve_scope_hierarchy(
    key: str,
    model_class: type[FeatureFlag] | type[Setting],
    project_id: Optional[Union[UUID, str]] = None,
    organisation_id: Optional[Union[UUID, str]] = None,
) -> Optional[FeatureFlag | Setting]:
    """
    Resolve a setting/flag following scope hierarchy: project → organisation → global.

    Args:
        key: Setting/flag key to look up
        model_class: Model class (FeatureFlag or Setting)
        project_id: Optional project UUID for project-scoped lookup
        organisation_id: Optional organisation UUID for org-scoped lookup

    Returns:
        Model instance if found, None otherwise

    Hierarchy logic:
        1. If project_id provided: check PROJECT scope first
        2. If organisation_id provided (or inferred from project): check ORGANISATION scope
        3. Always check GLOBAL scope as fallback
    """
    # Try project scope first
    if project_id:
        result = model_class.objects.filter(
            key=key, scope_type=ScopeType.PROJECT, project_id=project_id
        ).first()
        if result:
            return result

        # Infer organisation_id from project if not provided
        if not organisation_id:
            from projects.models import Project

            project = Project.objects.filter(id=project_id).first()
            if project:
                organisation_id = project.organisation_id

    # Try organisation scope
    if organisation_id:
        result = model_class.objects.filter(
            key=key,
            scope_type=ScopeType.ORGANISATION,
            organisation_id=organisation_id,
            project_id=None,
        ).first()
        if result:
            return result

    # Fallback to global scope
    return model_class.objects.filter(
        key=key,
        scope_type=ScopeType.GLOBAL,
        organisation_id=None,
        project_id=None,
    ).first()


def get_flag(
    key: str,
    project_id: Optional[Union[UUID, str]] = None,
    organisation_id: Optional[Union[UUID, str]] = None,
    default: bool = False,
) -> bool:
    """
    Get a feature flag value with scope hierarchy resolution.

    Args:
        key: Feature flag key
        project_id: Optional project UUID for project-scoped lookup
        organisation_id: Optional organisation UUID for org-scoped lookup
        default: Default value if flag not found (default: False)

    Returns:
        Boolean flag value

    Examples:
        >>> get_flag('maintenance_mode')  # Global scope
        False
        >>> get_flag('beta_features', organisation_id=org_id)  # Org scope with global fallback
        True
        >>> get_flag('dark_mode', project_id=proj_id)  # Project → org → global fallback
        False
    """
    flag = _resolve_scope_hierarchy(key, FeatureFlag, project_id, organisation_id)
    return flag.enabled if flag else default


def get_setting(
    key: str,
    project_id: Optional[Union[UUID, str]] = None,
    organisation_id: Optional[Union[UUID, str]] = None,
    default: Any = None,
) -> Any:
    """
    Get a setting value with scope hierarchy resolution and type coercion.

    Args:
        key: Setting key
        project_id: Optional project UUID for project-scoped lookup
        organisation_id: Optional organisation UUID for org-scoped lookup
        default: Default value if setting not found

    Returns:
        Setting value coerced to appropriate Python type based on value_type

    Examples:
        >>> get_setting('max_upload_size', organisation_id=org_id)  # Returns integer
        10485760
        >>> get_setting('feature_config', project_id=proj_id)  # Returns dict
        {'enabled': True, 'threshold': 100}
        >>> get_setting('api_endpoint', default='https://api.example.com')  # Returns string
        'https://api.production.com'
    """
    from .models import SettingType

    setting = _resolve_scope_hierarchy(key, Setting, project_id, organisation_id)
    if not setting:
        return default

    # Return value with type coercion based on value_type
    value = setting.value

    if setting.value_type == SettingType.STRING:
        return str(value) if value is not None else default
    elif setting.value_type == SettingType.INTEGER:
        return int(value) if value is not None else default
    elif setting.value_type == SettingType.BOOLEAN:
        return bool(value) if value is not None else default
    elif setting.value_type == SettingType.JSON:
        return value if value is not None else default

    return value


def set_flag(
    key: str,
    enabled: bool,
    scope: str = "global",
    organisation_id: Optional[Union[UUID, str]] = None,
    project_id: Optional[Union[UUID, str]] = None,
    user: Optional[Any] = None,
    description: str = "",
) -> FeatureFlag:
    """
    Set a feature flag value with cache invalidation.

    Args:
        key: Feature flag key
        enabled: Boolean flag value
        scope: Scope type ('global', 'organisation', 'project')
        organisation_id: Organisation UUID for org/project scope
        project_id: Project UUID for project scope
        user: User performing the action (for audit trail)
        description: Optional description

    Returns:
        FeatureFlag instance

    Examples:
        >>> set_flag('maintenance_mode', True, scope='global', user=request.user)
        <FeatureFlag: maintenance_mode (GLOBAL)>
        >>> set_flag(
        ...     'beta_features',
        ...     True,
        ...     scope='organisation',
        ...     organisation_id=org_id,
        ...     user=request.user
        ... )
        <FeatureFlag: beta_features (ORGANISATION)>
    """
    from .cache import generate_cache_key, invalidate_cache, publish_invalidation

    # Map string scope to ScopeType enum
    scope_map = {
        "global": ScopeType.GLOBAL,
        "organisation": ScopeType.ORGANISATION,
        "project": ScopeType.PROJECT,
    }
    scope_type = scope_map.get(scope.lower(), ScopeType.GLOBAL)

    # Get or create the flag
    defaults = {
        "enabled": enabled,
        "description": description,
        "created_by": user,
        "updated_by": user,
    }

    filter_kwargs = {
        "key": key,
        "scope_type": scope_type,
        "organisation_id": organisation_id,
        "project_id": project_id,
    }

    flag, _ = FeatureFlag.objects.update_or_create(
        **filter_kwargs,
        defaults=defaults,
    )

    # Invalidate cache
    cache_key = generate_cache_key("flag", key, scope, organisation_id or project_id)
    invalidate_cache(cache_key)
    publish_invalidation(cache_key)

    return flag


def set_setting(
    key: str,
    value: Any,
    value_type: str = "STRING",
    default_value: Any = None,
    scope: str = "global",
    organisation_id: Optional[Union[UUID, str]] = None,
    project_id: Optional[Union[UUID, str]] = None,
    user: Optional[Any] = None,
    description: str = "",
) -> Setting:
    """
    Set a setting value with cache invalidation.

    Args:
        key: Setting key
        value: Setting value
        value_type: Value type ('STRING', 'INTEGER', 'BOOLEAN', 'JSON')
        default_value: Default value
        scope: Scope type ('global', 'organisation', 'project')
        organisation_id: Organisation UUID for org/project scope
        project_id: Project UUID for project scope
        user: User performing the action (for audit trail)
        description: Optional description

    Returns:
        Setting instance

    Examples:
        >>> set_setting(
        ...     'max_upload_size',
        ...     10485760,
        ...     value_type='INTEGER',
        ...     default_value=5242880,
        ...     user=request.user
        ... )
        <Setting: max_upload_size (GLOBAL)>
    """
    from .cache import generate_cache_key, invalidate_cache, publish_invalidation
    from .models import SettingType

    # Map string type to SettingType enum
    type_map = {
        "STRING": SettingType.STRING,
        "INTEGER": SettingType.INTEGER,
        "BOOLEAN": SettingType.BOOLEAN,
        "JSON": SettingType.JSON,
    }
    setting_type = type_map.get(value_type.upper(), SettingType.STRING)

    # Map string scope to ScopeType enum
    scope_map = {
        "global": ScopeType.GLOBAL,
        "organisation": ScopeType.ORGANISATION,
        "project": ScopeType.PROJECT,
    }
    scope_type = scope_map.get(scope.lower(), ScopeType.GLOBAL)

    # Get or create the setting
    defaults = {
        "value": value,
        "value_type": setting_type,
        "default_value": default_value if default_value is not None else value,
        "description": description,
        "created_by": user,
        "updated_by": user,
    }

    filter_kwargs = {
        "key": key,
        "scope_type": scope_type,
        "organisation_id": organisation_id,
        "project_id": project_id,
    }

    setting, _ = Setting.objects.update_or_create(
        **filter_kwargs,
        defaults=defaults,
    )

    # Invalidate cache
    cache_key = generate_cache_key("setting", key, scope, organisation_id or project_id)
    invalidate_cache(cache_key)
    publish_invalidation(cache_key)

    return setting
