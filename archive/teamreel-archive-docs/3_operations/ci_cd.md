# 🚀 CI/CD Documentation - TeamReel

## Overview
TeamReel gebruikt een self-hosted Windows runner voor CI/CD met GitHub Actions. Het systeem is geoptimaliseerd voor PowerShell en ondersteunt multi-layer architectuur deployment.

## 🏗️ Architecture

### Repository Structure
- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Django REST Framework
- **AI**: LangGraph workflows
- **Deployment**: Railway PaaS
- **CI/CD**: GitHub Actions (Windows self-hosted)

### Workflow Types
1. **CI Pipeline** (`ci.yml`) - Build, test, validate
2. **Deploy Pipeline** (`deploy.yml`) - Production deployment
3. **Validation Pipeline** (`validate-setup.yml`) - Repository health check

## 📋 GitHub Templates

### Issue Templates
Located in `.github/ISSUE_TEMPLATE/`:

- **Bug Report** (`bug_report.md`)
  - Structured bug reporting
  - Environment details
  - Reproduction steps
  - Acceptance criteria

- **Feature Request** (`feature_request.md`)
  - Feature specification
  - Technical requirements
  - Business value assessment
  - Priority classification

- **Task/Chore** (`task.md`)
  - General maintenance tasks
  - Refactoring work
  - Documentation updates
  - Time estimation

### Pull Request Template
Located in `.github/pull_request_template.md`:

- Change type classification
- Technical impact assessment
- Testing checklist
- Code review guidelines
- Deployment notes

## ⚙️ CI/CD Workflows

### CI Pipeline (`ci.yml`)
**Triggers**: Push/PR to `main`, `develop`, manual dispatch
**Runner**: Self-hosted Windows

**Jobs**:

#### 1. Backend CI
- Python dependency installation (pip)
- Code quality checks (Black formatter)
- Linting (Flake8)
- Django system checks (`manage.py check --deploy`)
- Django test suite execution
- Test coverage reporting (pytest-cov)

#### 2. Frontend CI
- Node.js dependency installation (npm ci)
- ESLint checks
- Build validation (`npm run build`)
- Frontend test suite

#### 3. Security Check
- Python security audit (Safety)
- npm security audit

#### 4. CI Status Report
- Aggregated status from all jobs
- Pass/fail determination

### Deploy Pipeline (`deploy.yml`)
**Triggers**: Push to `main`, manual dispatch with environment selection
**Runner**: Self-hosted Windows

**Jobs**:

#### 1. Pre-Deployment Checks
- Verify required files (requirements.txt, Dockerfile)
- Display deployment configuration
- Validate CI status

#### 2. Deploy to Railway
- Install/verify Railway CLI
- Configure Railway authentication
- Deploy application (`railway up --detach`)
- Wait for deployment completion (max 5 minutes)
- Run application health checks

#### 3. Post-Deployment
- Display deployment status
- Create deployment tag (format: `deploy-{env}-{timestamp}`)
- Show application URLs and Railway dashboard link

### Validation Pipeline (`validate-setup.yml`)
**Triggers**: PR affecting `.github/`, manual dispatch
**Runner**: Self-hosted Windows

**Validation Checks**:
- GitHub templates existence
- Workflow YAML syntax
- Railway configuration
- Repository structure
- Documentation completeness

## 🔐 Secrets Configuration

### Required Secrets
Add to repository Settings > Secrets and variables > Actions:

```yaml
GITHUB_TOKEN: # Auto-provided by GitHub
RAILWAY_TOKEN: # Railway deployment token
```

### Railway Token Setup
1. Login to Railway dashboard
2. Go to Account Settings > Tokens
3. Generate new token with deployment permissions
4. Add as `RAILWAY_TOKEN` secret in GitHub

## 🚀 Railway Deployment

### Configuration File (`railway.json`)
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build:all"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Deployment Process
1. Code push to `main` branch
2. CI pipeline validates build
3. Deploy workflow triggers
4. Railway CLI deploys to production
5. Health checks verify deployment

## 🧪 Testing Strategy

### Test Types
- **Unit Tests**: Component/function level
- **Integration Tests**: API/database integration
- **E2E Tests**: Full workflow validation
- **Pipeline Tests**: CI/CD workflow validation

### Test Commands
```powershell
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
python -m pytest

# AI tests
cd ai
python -m pytest tests/

# Full test suite
npm run test:all
```

## 📊 Monitoring & Logging

### CI/CD Monitoring
- GitHub Actions dashboard
- Railway deployment logs
- Self-hosted runner monitoring

### Log Locations
- **CI Logs**: GitHub Actions interface
- **Deploy Logs**: Railway dashboard
- **Runner Logs**: Local runner `_diag/` folder

## 🔧 Troubleshooting

### Common Issues

**Pipeline Fails on Dependencies**
```powershell
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
Remove-Item node_modules -Recurse -Force
npm install
```

**Railway Deployment Fails**
```powershell
# Check Railway CLI
railway --version

# Re-authenticate
railway login --token $env:RAILWAY_TOKEN

# Manual deployment
railway up --detach
```

**Self-hosted Runner Issues**
```powershell
# Check runner status
cd actions-runner
.\run.cmd --check

# Restart runner service
.\svc.sh stop
.\svc.sh start
```

## 📈 Best Practices

### Commit Messages
Use conventional commits:
```
feat(frontend): add video upload component
fix(backend): resolve API authentication issue
docs(ci): update deployment documentation
test(ai): add LangGraph workflow tests
```

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Emergency fixes

### PR Guidelines
1. Fill out PR template completely
2. Include tests for new features
3. Update documentation
4. Ensure CI passes
5. Request appropriate reviewers

---
*Last updated: 2025-11-07*
*TeamReel CI/CD Documentation v1.0*
