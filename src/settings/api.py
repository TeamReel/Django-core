"""Python query API for feature flags and settings."""

from typing import Any, Optional, Union
from uuid import UUID

from .models import FeatureFlag, ScopeType, Setting


def _resolve_scope_hierarchy(
    key: str,
    model_class: type[FeatureFlag] | type[Setting],
    user_id: Optional[Union[UUID, str]] = None,
    project_id: Optional[Union[UUID, str]] = None,
    organisation_id: Optional[Union[UUID, str]] = None,
) -> Optional[FeatureFlag | Setting]:
    """
    Resolve a setting/flag following scope hierarchy: user → project → organisation → global.

    Args:
        key: Setting/flag key to look up
        model_class: Model class (FeatureFlag or Setting)
        user_id: Optional user UUID for user-scoped lookup
        project_id: Optional project UUID for project-scoped lookup
        organisation_id: Optional organisation UUID for org-scoped lookup

    Returns:
        Model instance if found, None otherwise

    Hierarchy logic:
        1. If user_id provided: check USER scope first (highest priority)
        2. If project_id provided: check PROJECT scope
        3. If organisation_id provided (or inferred from project): check ORGANISATION scope
        4. Always check GLOBAL scope as fallback
    """
    # Try user scope first (highest priority)
    if user_id:
        result = model_class.objects.filter(
            key=key, scope_type=ScopeType.USER, user_id=user_id
        ).first()
        if result:
            return result

    # Try project scope
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
        user_id=None,
        organisation_id=None,
        project_id=None,
    ).first()


def get_flag(
    key: str,
    user_id: Optional[Union[UUID, str]] = None,
    project_id: Optional[Union[UUID, str]] = None,
    organisation_id: Optional[Union[UUID, str]] = None,
    default: bool = False,
) -> bool:
    """
    Get a feature flag value with scope hierarchy resolution and caching.

    Args:
        key: Feature flag key
        user_id: Optional user UUID for user-scoped lookup
        project_id: Optional project UUID for project-scoped lookup
        organisation_id: Optional organisation UUID for org-scoped lookup
        default: Default value if flag not found (default: False)

    Returns:
        Boolean flag value

    Examples:
        >>> get_flag('maintenance_mode')  # Global scope
        False
        >>> get_flag('beta_features', user_id=user_id)  # User scope with fallback
        True
        >>> get_flag('beta_features', organisation_id=org_id)  # Org scope with global fallback
        True
        >>> get_flag('dark_mode', project_id=proj_id)  # Project → org → global fallback
        False
    """
    from .cache import generate_cache_key, get_cached_value, set_cached_value

    # Try to resolve from cache first, checking all possible scopes
    scopes_to_check = []

    # Build scope hierarchy to check (user → project → org → global)
    if user_id:
        scopes_to_check.append(("user", user_id))

    if project_id:
        scopes_to_check.append(("project", project_id))
        # Infer organisation_id from project if not provided
        if not organisation_id:
            from projects.models import Project

            try:
                project = Project.objects.filter(id=project_id).first()
                if project:
                    organisation_id = project.organisation_id
            except (ImportError, AttributeError):
                pass  # Graceful degradation if projects app not available

    if organisation_id:
        scopes_to_check.append(("organisation", organisation_id))

    scopes_to_check.append(("global", None))

    # Check cache for each scope in hierarchy order
    for scope_name, scope_id in scopes_to_check:
        cache_key = generate_cache_key("flag", key, scope_name, scope_id)
        cached_value = get_cached_value(cache_key)
        if cached_value is not None:
            return cached_value

    # Cache miss - query database using hierarchy resolution
    flag = _resolve_scope_hierarchy(key, FeatureFlag, user_id, project_id, organisation_id)
    result = flag.enabled if flag else default

    # Cache the result at the appropriate scope
    if flag:
        # Determine the scope that was actually used
        if flag.scope_type == "USER":
            cache_scope, cache_id = "user", flag.user_id
        elif flag.scope_type == "PROJECT":
            cache_scope, cache_id = "project", flag.project_id
        elif flag.scope_type == "ORGANISATION":
            cache_scope, cache_id = "organisation", flag.organisation_id
        else:
            cache_scope, cache_id = "global", None

        cache_key = generate_cache_key("flag", key, cache_scope, cache_id)
        set_cached_value(cache_key, result)

    return result


def get_setting(
    key: str,
    user_id: Optional[Union[UUID, str]] = None,
    project_id: Optional[Union[UUID, str]] = None,
    organisation_id: Optional[Union[UUID, str]] = None,
    default: Any = None,
) -> Any:
    """
    Get a setting value with scope hierarchy resolution, caching, and type coercion.

    Args:
        key: Setting key
        user_id: Optional user UUID for user-scoped lookup
        project_id: Optional project UUID for project-scoped lookup
        organisation_id: Optional organisation UUID for org-scoped lookup
        default: Default value if setting not found

    Returns:
        Setting value coerced to appropriate Python type based on value_type

    Examples:
        >>> get_setting('max_upload_size', organisation_id=org_id)  # Returns integer
        10485760
        >>> get_setting('feature_config', user_id=user_id)  # Returns dict from user prefs
        {'enabled': True, 'threshold': 100}
        >>> get_setting('feature_config', project_id=proj_id)  # Returns dict
        {'enabled': True, 'threshold': 100}
        >>> get_setting('api_endpoint', default='https://api.example.com')  # Returns string
        'https://api.production.com'
    """
    from .cache import generate_cache_key, get_cached_value, set_cached_value
    from .models import SettingType

    # Try to resolve from cache first, checking all possible scopes
    scopes_to_check = []

    # Build scope hierarchy to check (user → project → org → global)
    if user_id:
        scopes_to_check.append(("user", user_id))

    if project_id:
        scopes_to_check.append(("project", project_id))
        # Infer organisation_id from project if not provided
        if not organisation_id:
            from projects.models import Project

            try:
                project = Project.objects.filter(id=project_id).first()
                if project:
                    organisation_id = project.organisation_id
            except (ImportError, AttributeError):
                pass  # Graceful degradation if projects app not available

    if organisation_id:
        scopes_to_check.append(("organisation", organisation_id))

    scopes_to_check.append(("global", None))

    # Check cache for each scope in hierarchy order
    for scope_name, scope_id in scopes_to_check:
        cache_key = generate_cache_key("setting", key, scope_name, scope_id)
        cached_value = get_cached_value(cache_key)
        if cached_value is not None:
            return cached_value

    # Cache miss - query database using hierarchy resolution
    setting = _resolve_scope_hierarchy(key, Setting, user_id, project_id, organisation_id)
    if not setting:
        return default

    # Return value with type coercion based on value_type
    value = setting.value
    result = default

    if setting.value_type == SettingType.STRING:
        result = str(value) if value is not None else default
    elif setting.value_type == SettingType.INTEGER:
        result = int(value) if value is not None else default
    elif setting.value_type == SettingType.BOOLEAN:
        result = bool(value) if value is not None else default
    elif setting.value_type == SettingType.JSON:
        result = value if value is not None else default
    else:
        result = value

    # Cache the result at the appropriate scope
    if setting and result != default:
        # Determine the scope that was actually used
        if setting.scope_type == "USER":
            cache_scope, cache_id = "user", setting.user_id
        elif setting.scope_type == "PROJECT":
            cache_scope, cache_id = "project", setting.project_id
        elif setting.scope_type == "ORGANISATION":
            cache_scope, cache_id = "organisation", setting.organisation_id
        else:
            cache_scope, cache_id = "global", None

        cache_key = generate_cache_key("setting", key, cache_scope, cache_id)
        set_cached_value(cache_key, result)

    return result


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
