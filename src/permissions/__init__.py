"""Hierarchical Access Control System

This app provides role-based access control with three scope levels:
- Global (system-wide)
- Organization (all projects within org)
- Project (specific project only)

Additive inheritance model: project-level roles grant additional permissions
beyond organization-level roles (most permissive wins).
"""

default_app_config = "permissions.apps.PermissionsConfig"
