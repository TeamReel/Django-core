# System Health - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Basis systeem gezondheid check
- **Time**: 2 minuten
- **Prerequisites**: Toegang tot terminal
- **Test Data**: Geen specifieke data nodig

## 🚀 Quick Check Commands
```bash
# Django backend check
python manage.py check

# Database connectie
python manage.py migrate --check

# Static files
python manage.py collectstatic --dry-run

# Frontend dependencies
pnpm install --frozen-lockfile
```

## 📋 Visual Test Scenarios

### Scenario 1: Django Backend Health
**Steps**:
1. Open terminal in django-core root
2. Run: `python manage.py check`
3. Run: `python manage.py migrate --check`

**Expected Results**:
- ✅ "System check identified no issues"
- ✅ No pending migrations message
- ✅ No error messages in terminal

**Pass/Fail**:
- [ ] Pass: All commands run without errors
- [ ] Fail: Document any error messages

### Scenario 2: Database Connection
**Steps**:
1. Run: `python manage.py shell`
2. Type: `from django.db import connection; connection.ensure_connection()`
3. Type: `from django.contrib.auth.models import User; print(User.objects.count())`
4. Type: `exit()`

**Expected Results**:
- ✅ Shell starts without errors
- ✅ Database connection succeeds
- ✅ User count displays (any number is fine)

**Pass/Fail**:
- [ ] Pass: Database connection works
- [ ] Fail: Connection errors or timeouts

### Scenario 3: Frontend Dependencies
**Steps**:
1. Run: `pnpm install --frozen-lockfile`
2. Run: `pnpm type-check`
3. Run: `pnpm build --dry-run` (if available)

**Expected Results**:
- ✅ Dependencies install without errors
- ✅ Type checking passes
- ✅ No missing dependencies warnings

**Pass/Fail**:
- [ ] Pass: All frontend checks pass
- [ ] Fail: Dependency or type errors

### Scenario 4: Server Startup Test
**Steps**:
1. Run: `python manage.py runserver --check`
2. Check output for any warnings
3. Stop with Ctrl+C

**Expected Results**:
- ✅ Server ready message appears
- ✅ No deprecation warnings
- ✅ Clean startup without errors

**Pass/Fail**:
- [ ] Pass: Clean server startup
- [ ] Fail: Warnings or errors during startup

## 🐛 Troubleshooting

### Common Issues

**Database Connection Fails**:
- Check PostgreSQL is running
- Verify database credentials in settings
- Run migrations if needed

**Missing Dependencies**:
- Run `pip install -r requirements/development.txt`
- Run `pnpm install` in root directory

**Port Already in Use**:
- Check for existing Django/Node processes
- Use different port: `python manage.py runserver 8001`

**Permission Errors**:
- Check file permissions
- Run as administrator if needed (Windows)

## 📊 Test Results

**Template voor eigen gebruik**:
```
Date tested: [TODAY'S DATE]
OS: [Windows/Mac/Linux]
Python version: [python --version]
Node version: [node --version]
Status: [ ] ✅ Pass / [ ] ❌ Fail / [ ] ⚠️ Partial

Issues found:
- [List any issues]

Notes:
- [Any observations]
```

## ✅ Success Criteria

Dit test is succesvol als:
- Alle Django checks slagen
- Database verbinding werkt
- Frontend dependencies zijn OK
- Server kan opstarten zonder errors

**Next Step**: Als deze test slaagt, ga door naar [02-demo-shell.md](02-demo-shell.md)
