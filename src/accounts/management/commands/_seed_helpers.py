"""
Seed data helpers for demo database generation.

Provides utilities for:
- Deterministic randomness with seeded RNG
- Realistic name generation (no lorem ipsum)
- Date/timestamp generation within last 30 days
- Data factories with shared configuration
"""

import os
import random
from datetime import datetime, timedelta
from typing import List, Tuple

from django.utils import timezone

# ============================================================================
# CONSTANTS
# ============================================================================

# Organization definitions (5 diverse scenarios)
ORG_DATA = [
    {
        "name": "TechCorp Startup",
        "slug": "techcorp",
        "credits": 1000,
        "user_count": 5,
        "project_count": 15,
        "description": "Fast-growing tech startup",
    },
    {
        "name": "DataLab Enterprise",
        "slug": "datalab",
        "credits": 5000,
        "user_count": 8,
        "project_count": 30,
        "description": "Large enterprise with complex hierarchy",
    },
    {
        "name": "MarketingHub Agency",
        "slug": "marketinghub",
        "credits": 200,
        "user_count": 4,
        "project_count": 10,
        "description": "Small agency, budget-conscious",
    },
    {
        "name": "OpenSource Collective",
        "slug": "opensource",
        "credits": 100,
        "user_count": 2,
        "project_count": 5,
        "description": "Non-profit, minimal resources",
    },
    {
        "name": "AI Research Inc",
        "slug": "airesearch",
        "credits": 3000,
        "user_count": 6,
        "project_count": 20,
        "description": "AI/ML research organization",
    },
]

# Demo account definitions (4 pre-configured accounts)
DEMO_ACCOUNTS = [
    {
        "email": "admin@demo.djangocore.app",
        "first_name": "Admin",
        "last_name": "User",
        "role": "superuser",
        "org": None,  # Global access
    },
    {
        "email": "user@demo.djangocore.app",
        "first_name": "Regular",
        "last_name": "User",
        "role": "member",
        "org": "techcorp",
    },
    {
        "email": "manager@demo.djangocore.app",
        "first_name": "Manager",
        "last_name": "Admin",
        "role": "admin",
        "org": "datalab",
    },
    {
        "email": "viewer@demo.djangocore.app",
        "first_name": "View",
        "last_name": "Only",
        "role": "viewer",
        "org": "marketinghub",
    },
]

# Realistic first/last names (curated lists, no lorem ipsum)
FIRST_NAMES = [
    "Emma",
    "Liam",
    "Olivia",
    "Noah",
    "Ava",
    "Ethan",
    "Sophia",
    "Mason",
    "Isabella",
    "William",
    "Mia",
    "James",
    "Charlotte",
    "Benjamin",
    "Amelia",
    "Lucas",
    "Harper",
    "Henry",
    "Evelyn",
    "Alexander",
    "Abigail",
    "Michael",
    "Emily",
    "Daniel",
    "Elizabeth",
    "Matthew",
    "Sofia",
    "Jackson",
    "Avery",
    "Sebastian",
    "Ella",
    "Jack",
    "Scarlett",
    "Aiden",
    "Grace",
    "Owen",
]

LAST_NAMES = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
    "Walker",
    "Young",
    "Allen",
    "King",
    "Wright",
]

# Project name components
PROJECT_PREFIXES = [
    "Next-Gen",
    "Legacy",
    "Modern",
    "Cloud",
    "Quantum",
    "Alpha",
    "Beta",
    "Core",
    "Advanced",
    "Smart",
    "AI-Powered",
    "Mobile",
    "Web",
    "Enterprise",
]

PROJECT_TYPES = [
    "Platform",
    "API",
    "Dashboard",
    "Portal",
    "Engine",
    "Service",
    "App",
    "System",
    "Tool",
    "Framework",
    "Pipeline",
    "Analytics",
    "Hub",
    "Suite",
]

# Event types for audit logging
EVENT_TYPES = [
    "user.login",
    "user.logout",
    "user.password_reset",
    "project.created",
    "project.updated",
    "project.archived",
    "user.added",
    "user.removed",
    "org.updated",
    "org.settings_changed",
    "credits.purchased",
    "transaction.created",
    "permission.changed",
    "role.assigned",
]

# Notification types
NOTIFICATION_TYPES = [
    ("system", "Platform update available"),
    ("system", "Scheduled maintenance window"),
    ("org", "Low credit balance alert"),
    ("org", "New member joined"),
    ("org", "Settings updated"),
    ("project", "Status changed to active"),
    ("project", "New comment on project"),
    ("project", "You were mentioned"),
    ("project", "Task assigned to you"),
]


# ============================================================================
# SEEDED RANDOMNESS
# ============================================================================


class SeededRandom:
    """
    Deterministic random number generator using DEMO_RANDOM_SEED.

    If DEMO_RANDOM_SEED is set, all random operations are deterministic.
    Otherwise, uses system randomness for variety across runs.
    """

    def __init__(self):
        seed_value = os.environ.get("DEMO_RANDOM_SEED")
        if seed_value:
            self.rng = random.Random(int(seed_value))
            self.seeded = True
        else:
            self.rng = random.Random()
            self.seeded = False

    def randint(self, a: int, b: int) -> int:
        """Random integer in [a, b]."""
        return self.rng.randint(a, b)

    def choice(self, seq: list):
        """Random element from sequence."""
        return self.rng.choice(seq)

    def sample(self, population: list, k: int) -> list:
        """Random k-length sample from population."""
        return self.rng.sample(population, k)

    def shuffle(self, seq: list) -> None:
        """Shuffle sequence in place."""
        self.rng.shuffle(seq)


# Global seeded random instance
seeded_random = SeededRandom()


# ============================================================================
# DATE/TIME HELPERS
# ============================================================================


def random_datetime_last_30_days() -> datetime:
    """Generate random datetime within last 30 days."""
    now = timezone.now()
    days_ago = seeded_random.randint(0, 30)
    hours_offset = seeded_random.randint(0, 23)
    minutes_offset = seeded_random.randint(0, 59)

    return now - timedelta(days=days_ago, hours=hours_offset, minutes=minutes_offset)


def random_datetime_last_n_days(days: int) -> datetime:
    """Generate random datetime within last N days."""
    now = timezone.now()
    days_ago = seeded_random.randint(0, days)
    hours_offset = seeded_random.randint(0, 23)
    minutes_offset = seeded_random.randint(0, 59)

    return now - timedelta(days=days_ago, hours=hours_offset, minutes=minutes_offset)


def generate_timestamps(count: int, window_days: int = 30) -> List[datetime]:
    """Generate list of random timestamps sorted chronologically."""
    timestamps = [random_datetime_last_n_days(window_days) for _ in range(count)]
    return sorted(timestamps)


# ============================================================================
# NAME GENERATORS
# ============================================================================


def generate_user_name() -> Tuple[str, str]:
    """Generate realistic first + last name."""
    first = seeded_random.choice(FIRST_NAMES)
    last = seeded_random.choice(LAST_NAMES)
    return first, last


def generate_project_name() -> str:
    """Generate realistic project name."""
    prefix = seeded_random.choice(PROJECT_PREFIXES)
    type_name = seeded_random.choice(PROJECT_TYPES)
    return f"{prefix} {type_name}"


def generate_email(first_name: str, last_name: str, domain: str = "demo.djangocore.app") -> str:
    """Generate email from name components."""
    return f"{first_name.lower()}.{last_name.lower()}@{domain}"


# ============================================================================
# DATA FACTORIES
# ============================================================================


class SeedProgress:
    """Track and report seed generation progress."""

    def __init__(self, stdout):
        self.stdout = stdout
        self.counts = {}

    def log(self, entity: str, count: int, message: str = ""):
        """Log progress for entity."""
        self.counts[entity] = count
        if message:
            self.stdout.write(f"  {message}")
        else:
            self.stdout.write(f"  Created {count} {entity}")

    def summary(self) -> dict:
        """Return summary counts."""
        return self.counts.copy()


def get_demo_password() -> str:
    """Return demo account password."""
    return "Demo2024!"
