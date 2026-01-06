# ✅ Spec-Kitty Accept + Merge — Definitieve Handleiding (Volledig in één codeblok)

Dit is de complete, foutbestendige workflow om een feature uit een worktree correct te accepteren en te mergen in `main`.

Volg de stappen precies in deze volgorde.

---

## 1. Ga naar de hoofdrepo (niet de worktree!)

cd C:\Users\brian\Documents\Django-core

Controleer of je op main zit:

git branch

Als je niet op main zit:

git checkout main

---

## 2. Merge de feature-branch in main

De feature staat in `.worktrees/001-core-project-skeleton`.

Merge deze:

git merge 001-core-project-skeleton

**Als je fout krijgt:**
“untracked working tree files would be overwritten”

Voer uit:

git restore .gitignore
git clean -fd
git merge 001-core-project-skeleton

---

## 3. Maak een schone venv op main

python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements\local.txt

---

## 4. Run ALLE validatie-commando’s (verplicht voor accept)

python manage.py check
python manage.py check --deploy
coverage run -m pytest
coverage report
black --check src tests
ruff check src tests
mypy src
pre-commit run --all-files

Alles moet **PASS** geven.

---

## 5. Run de accept-feature stap

.kittify\scripts\powershell\accept-feature.ps1 `
  -FeatureSlug "001-core-project-skeleton" `
  -Mode "local" `
  -Tests @(
    "python manage.py check",
    "python manage.py check --deploy",
    "coverage run -m pytest",
    "coverage report",
    "black --check src tests",
    "ruff check src tests",
    "mypy src",
    "pre-commit run --all-files"
  ) `
  -Actor "brian" `
  -Json

De output toont:
- acceptance_status
- merge_instructions
- cleanup_instructions

---

## 6. Volg de merge_instructions precies op

Meestal is dat:

git add -A
git commit -m "Accept feature 001-core-project-skeleton"
git merge 001-core-project-skeleton --squash
git commit -m "Squashed merge of 001-core-project-skeleton"

Maar gebruik **altijd de exacte instructies** uit de JSON-output.

---

## 7. Ruim de worktree op volgens cleanup_instructions

Meestal:

git worktree remove .worktrees/001-core-project-skeleton --force
git branch -D 001-core-project-skeleton

---

## 8. Done 🎉

Je `main` bevat nu:

- de volledige skeleton
- alle validatie en tooling
- alle tasks/scenario’s
- alle documentatie
- geen worktrees meer
- een consistente, schone basis voor de volgende feature

Je kunt nu beginnen met:

**090-constitutional-enforcement-engine-lite-core-setup**

---

Einde van de handleiding.
