"""Prometheus metrics for organisation management."""

from prometheus_client import Counter, Gauge

# Gauge metrics (current state)
org_count = Gauge(
    "organisations_total",
    "Total number of active organisations",
)

membership_count = Gauge(
    "memberships_total",
    "Total number of active memberships",
)

# Counter metrics (cumulative events)
org_creations = Counter(
    "organisation_creations_total",
    "Total number of organisation creation events",
)

member_invitations = Counter(
    "member_invitations_total",
    "Total number of member invitation events",
)

role_changes = Counter(
    "role_changes_total",
    "Total number of role change events",
)

rate_limit_hits = Counter(
    "rate_limit_hits_total",
    "Total number of rate limit violations",
    ["endpoint"],
)
