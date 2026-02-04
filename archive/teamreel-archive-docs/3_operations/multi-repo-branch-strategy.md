# 🧠 Copilot – Module-uitvoering

Jij bent mijn actieve Copilot-ontwikkelassistent.
Definieer een multi-repository branchstrategie voor TeamReel.
- Eén productie-repository (privé) mét Railway/S3/CI/CD.
- Eén sandbox-repository (werkaccount) zonder cloud afhankelijkheden.

Commit: `feat(F1-B1.Y): multi-repo branch strategy`.

---
# 📋 Instruction Template
## 🎯 Block: Multi-Repository Branch Strategy
### Doelstelling
Een veilige, duidelijke structuur opzetten waarbij twee onafhankelijke repositories bestaan:
- Productie-repository met volledige cloud stack (Railway, S3, CI/CD, PostgreSQL)
- Sandbox-repository voor lokale ontwikkeling met Copilot, SQLite en lokale media

Beide repositories gebruiken `main` en `develop`, maar hebben verschillende governance en inhoud.

---
## 🏗 Repository Rollen
### 1. Productie Repository (Privé Account)
| Aspect | Details |
|--------|---------|
| Branch `main` | Productieklare releases, auto deploy via Railway |
| Branch `develop` | Actieve feature development met cloud resources |
| Infra | Railway (deploy), S3 (media), PostgreSQL, CI/CD pipelines |
| Security | Secrets & protected env vars |
| Niet aanwezig | Sandbox-only bestanden (`settings_sandbox.py`, `.env.sandbox`) |

### 2. Sandbox Repository (Werkaccount)
| Aspect | Details |
|--------|---------|
| Branch `main` | Stabiele sandboxbasis (geen cloud) |
| Branch `develop` | Experimentele Copilot + refactor omgeving |
| Infra | Alleen lokaal: SQLite + `media_local/` |
| AI | Mock of gedeactiveerd – geen externe API calls |
| Config | `settings_sandbox.py`, `.env.sandbox` |
| Verboden | Railway config, S3 integratie, CI/CD workflows, secrets |

---
## 🔐 Strikte Scheiding
| Element | Productie | Sandbox |
|---------|-----------|---------|
| Database | PostgreSQL (managed) | SQLite file |
| Media | S3 bucket | `media_local/` directory |
| Deploy Pipeline | Railway + CI/CD | Geen – lokale runserver |
| Secrets | .env.production / platform vars | Alleen lokale non-sensitive vars |
| AI | Externe endpoints mogelijk | Mock / gedeactiveerd |
| Monitoring | Kan Sentry/Grafana hebben | Console logging |

> Kernregel: De sandbox mag geen productie-autorisatie, secrets of cloud-artefacten bevatten.

---
## ➡️ Synchronisatie Regels (Productie → Sandbox)
### Wanneer synchroniseren?
Alleen wanneer productierepo nieuwe stabiele features/fixes bevat die lokaal getest moeten worden.

### Hoe synchroniseren? (Stappenplan)
```pwsh
# 1. Clone productie repository (privé account)
git clone git@github.com:priverepo/teamreel-core-app.git teamreel-prod
cd teamreel-prod

# 2. Zorg dat je op de gewenste bronbranch zit (bijv. main)
git switch main

# 3. Kopieer alleen veilige directories naar tijdelijke map
# (GEEN deploy / infra / secret bestanden meenemen)
robocopy backend ..\sync_temp\backend /E /XF railway.toml settings_prod.py
robocopy frontend ..\sync_temp\frontend /E
robocopy docs ..\sync_temp\docs /E
robocopy ai ..\sync_temp\ai /E
copy package.json ..\sync_temp\
copy requirements.txt ..\sync_temp\

# 4. Verwijder cloud-specifieke configuratie uit sync_temp
Remove-Item ..\sync_temp\backend\railway.toml -ErrorAction SilentlyContinue
Remove-Item ..\sync_temp\railway.json -ErrorAction SilentlyContinue
Remove-Item ..\sync_temp\.env.production -ErrorAction SilentlyContinue

# 5. Ga naar sandbox repository
cd ..\teamreel-sandbox

# 6. Switch naar sandbox develop branch
git switch develop

# 7. Kopieer bestanden vanuit sync_temp naar sandbox
robocopy ..\sync_temp\backend backend /E
robocopy ..\sync_temp\frontend frontend /E
robocopy ..\sync_temp\docs docs /E
robocopy ..\sync_temp\ai ai /E
copy ..\sync_temp\package.json .\
copy ..\sync_temp\requirements.txt .\

# 8. Herstel sandbox specifieke bestanden
# (indien overschreven door productie)
# Zorg dat settings_sandbox.py en .env.sandbox intact blijven

# 9. Voer lokale validatie uit
python backend/manage.py migrate
python backend/manage.py runserver

# 10. Commit wijzigingen (optioneel)
git add .
git commit -m "chore: sync productie features naar sandbox"
```

### Post-Sync Checklist
- [ ] Geen Railway / S3 / CI/CD artefacten aanwezig
- [ ] `settings_sandbox.py` aanwezig & actief
- [ ] `media_local/` directory intact
- [ ] Geen secrets / API keys toegevoegd
- [ ] Tests draaien lokaal zonder externe calls
- [ ] AI mock gedrag onveranderd of gedeactiveerd volgens beleid

---
## 🔄 Branch Switch Workflow
### Productierepo
```pwsh
git switch develop
git switch main
```
### Sandboxrepo
```pwsh
git switch develop
git switch main
```
> Branch namen zijn gelijk voor cognitieve eenvoud; inhoud verschilt fundamenteel.

---
## 🔁 Merge Workflow
### Productierepo
| Stap | Actie |
|------|-------|
| Feature ontwikkeling | Branch `develop` |
| Review | Pull request naar `main` |
| Deploy | Automatisch via Railway pipeline |

### Sandboxrepo
| Stap | Actie |
|------|-------|
| Experiment / Refactor | Branch `develop` |
| Stabilisatie | Directe merge (lokaal of PR) naar `main` |
| Deploy | Geen – blijft lokaal |

---
## 🚫 Nooit Kopiëren Van Productie → Sandbox
| Artefact | Waarom |
|----------|--------|
| Railway config (`railway.json`, `railway.toml`) | Activeert ongewenste cloud deployment |
| S3 integratie / boto configs | Cloud storage verboden |
| CI/CD workflows (.github/workflows/*.yml) | Triggers buiten sandbox scope |
| Secrets / `.env.production` | Veiligheidsrisico |
| PostgreSQL DSN / `DATABASE_URL` | Sandbox gebruikt SQLite |
| Monitoring / tracing clients | Externe koppelingen |
| Externe AI API keys / endpoints | Alleen mock / lokaal |

---
## 🧪 Validatie Flow (Sandbox)
1. Start backend met `settings_sandbox.py`.
2. Controleer `api/health` voor `sqlite3` engine.
3. Zoek (`grep`) naar verboden termen: `Railway`, `S3`, `DATABASE_URL`, `OpenAI`.
4. Run tests (indien aanwezig).
5. Controleer docs op afwezigheid van cloud stappen.

---
## 🔍 Monitoring & Governance
| Aspect | Productie | Sandbox |
|--------|-----------|---------|
| Code Review | Pull Requests verplicht | Optioneel; lightweight |
| Security Scan | Geautomatiseerd | Handmatige checklist |
| Performance | Profiling mogelijk | Alleen lokale metingen |
| Release Notes | Formeel | Informeel / progress log |

---
## 🛠 Herstelproces (Rollback Sandbox Sync)
```pwsh
git log --oneline
# Kies commit vóór sync
git reset --hard <commit-id>
```
Of maak een revert commit: `git revert <sync-commit>`.

---
## 📘 Deliverables
- Dit document: `docs/3_operations/multi-repo-branch-strategy.md`
- Sandbox blijft vrij van cloud artefacten
- Copilot begrijpt onderscheid (verduidelijken in instructiebestand indien nodig)

---
## ✅ Samenvattende Checklist
| Item | Status |
|------|--------|
| Rollen gedefinieerd | ✔ |
| Sync stappen beschreven | ✔ |
| Forbidden lijst opgenomen | ✔ |
| Merge workflows gescheiden | ✔ |
| Post-sync checklist | ✔ |
| Template stijl gevolgd | ✔ |

---
*Kernboodschap:* Houd de sandbox puur lokaal en experimenteel; gebruik productie alleen als bron van stabiele, cloud-specifieke features – nooit als directe deployment target binnen sandbox.
