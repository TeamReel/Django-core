"""Projects & Workspaces Management app."""

# Intentionally avoid importing metrics at package import time.
# Metrics registration happens in ProjectsConfig.ready() to prevent
# side effects (and duplicated timeseries) during test collection.
