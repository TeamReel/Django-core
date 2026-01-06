# Demo Shell & Integration

**The Living Documentation of the Core-App**

The Demo Shell is the canonical integration surface for the Django Core-App.
Every shipped module MUST be demonstrable here.

## Access
- **URL**: [https://demo.django-core.com](https://demo.django-core.com) (Example)
- **Credentials**: See `DEMO_SEED.md`

## Integration Rules
1. **Neutral Core**: The core system (Orgs, Projects, Users) is domain-agnostic.
2. **Themed Overlay**: The "Football Leagues" demo is an *overlay* only. It must not leak into core models.
3. **No Empty States**: The demo must be populated with realistic data (see `DEMO_DB_STATUS.md`).

## Resources
- [Database Status](DEMO_DB_STATUS.md)
- [Seeding Guide](DEMO_SEED.md)
- [Smoke Tests](SMOKE_TEST_RESULTS.md)
