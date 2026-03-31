# 288 — P05 — Stack & Dependency Validation

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | DevOps / Platform Quality |
| Impact | 🟢 nice-to-have |
| Effort | ~15 uur |

## Wat

Continuous monitoring van dependencies voor CVEs, deprecations, en outdated versions. CVE scanning (pip-audit, npm audit), deprecation alerts, update recommendations, license compliance checks, en dependency tree visualisatie.

## Waarom belangrijk

Verouderde dependencies zijn een van de meest voorkomende security risico's (OWASP Top 10). Automatische scanning voorkomt dat kritieke kwetsbaarheden ongezien blijven. License compliance is essentieel zodra het product commercieel wordt — een onverwachte GPL-dependency kan juridische problemen veroorzaken.

## Past in TeamReel / CoreApp

- **TeamReel**: Gebruikt 50+ Python packages en 30+ npm packages. Eén kwetsbare dependency kan de hele productie-omgeving compromitteren.
- **CoreApp**: Dependency monitoring is een universeel platform concern. Elk serieus SaaS-product heeft geautomatiseerde CVE scanning nodig. Past in de Platform Quality Gates laag.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=P05-stack-dependency-validation

We bouwen geautomatiseerde dependency monitoring voor de Django 5 + React 18 stack.

[feature summary]
CI-geïntegreerde dependency scanning voor CVEs, deprecations, en license compliance met reporting.

[goals]
- CVE scan via pip-audit (Python) en npm audit (Node) in GitHub Actions
- Deprecation alerts voor EOL packages
- License compliance check: blokkeer GPL in proprietary code
- CI faalt bij critical CVEs
- Rapportage: dependency health summary

[non-goals]
- Runtime dependency monitoring (alleen CI-time)
- SBOM (Software Bill of Materials) generatie
- Custom vulnerability database

[tech context]
- Python deps: requirements/*.txt (pip)
- Node deps: demo/package.json + pnpm-lock.yaml
- CI: GitHub Actions
- Backend: Django 5, DRF, Celery, PostgreSQL
- Frontend: React 18, TypeScript, Vite
```

### Plan

```
/spec-kitty.plan feature=P05-stack-dependency-validation

[tech choices]
- Python CVE scanning: pip-audit (officieel PyPA tool)
- Node CVE scanning: pnpm audit (ingebouwd in pnpm)
- License check: pip-licenses (Python) + license-checker (Node)
- CI: GitHub Actions workflow (.github/workflows/dependency-check.yml)
- Reporting: JSON output → GitHub Actions summary
- Schedule: wekelijks via cron trigger + bij elke PR

[files to create]
- .github/workflows/dependency-check.yml — CI workflow
- scripts/check-licenses.sh — license compliance script
- docs/security/dependency-policy.md — beleid documentatie

[no Django models needed — pure CI/tooling]
```

### Research

```
/spec-kitty.research feature=P05-stack-dependency-validation

Onderzoek de volgende punten:

1. Welke dependencies staan er in requirements/*.txt en demo/package.json? Hoeveel in totaal?
2. Zijn er bekende CVEs in de huidige dependency set? Run pip-audit en pnpm audit.
3. Welke licenses worden er gebruikt? Zijn er GPL-dependencies?
4. Bestaat er al een GitHub Actions workflow voor security scanning?
5. Wat is de beste manier om pip-audit te integreren met het bestaande CI/CD setup?
```
