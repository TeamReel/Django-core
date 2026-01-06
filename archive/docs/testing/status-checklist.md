# Overall Test Guide - Django Core

Dit is de centrale testgids voor het Django Core project. Deze gids wordt continu bijgewerkt als nieuwe features klaar zijn.

## 🎯 Test Status Overview

### ✅ Completed & Tested
- **Backend Foundation** (B04, B05, B13)
  - i18n: Internationalization system ✅
  - Auth: User accounts & authentication ✅
  - API: REST API foundation ✅
- **Organization Management** (B06)
  - Multi-tenant organizations ✅
- **Security & Permissions** (B08, B10)
  - Role-based access control ✅
  - Security baseline ✅
- **File Management** (B34)
  - File upload/download system ✅
  - Demo interface ✅

### 🚧 In Progress
- **Frontend System** (F01, F03, F07)
  - Design system components ⚠️
  - Multi-tenancy context switcher ⚠️
  - Theme system ⚠️
- **Task Management** (B15)
  - Background task processing ⚠️

### 📋 Not Started
- **Notifications** (B16, B17, F08)
- **Billing Integration** (B12)
- **Advanced Features** (B09, B11, B18)

## 🗂️ Test Documentation Structure

### Core Test Guides
- **[This File]** - Overall progress tracking
- **[docs/contributing/testing.md]** - General testing patterns & setup
- **[DEMO_TEST_GUIDE.md]** - Manual testing for File Management demo
- **[docs/testing/security-baseline.md]** - Security baseline testing
- **[docs/testing.md]** - Constitution engine testing

### Feature-Specific Test Guides
- **Backend Features**: See `tests/` directory
- **Frontend Features**: See individual package test files
- **Integration Tests**: See `tests/integration/`
- **Demo Tests**: Individual guides in root directory

## 🚀 Quick Start Testing

### Essential System Tests (5 minutes)
1. **Backend Health**: `python manage.py check` ✅
2. **Database**: `python manage.py migrate` ✅
3. **API**: Test authentication at `/api/auth/` ✅
4. **Frontend**: Start demo-shell `pnpm dev` ✅
5. **Demo Access**: Visit http://localhost:3000 ✅

### Full System Tests (30 minutes)
1. **Run Backend Tests**: `cd src && pytest`
2. **Run Frontend Tests**: `pnpm test`
3. **Manual Demo Tests**: Follow [DEMO_TEST_GUIDE.md](DEMO_TEST_GUIDE.md)
4. **Integration Tests**: `pytest tests/integration/`
5. **Security Tests**: `pytest tests/security_baseline/`

## 📊 Test Commands

### Backend Testing
```bash
# All tests
cd src && pytest

# With coverage
cd src && pytest --cov=. --cov-report=html

# Specific app
pytest tests/accounts/
pytest tests/files/
pytest tests/permissions/

# Integration tests
pytest tests/integration/

# Security tests
pytest tests/security_baseline/
```

### Frontend Testing
```bash
# All packages
pnpm test

# Specific package
cd packages/design-system && pnpm test
cd packages/auth && pnpm test

# Type checking
pnpm type-check

# Build tests
pnpm build
```

### Demo Testing
```bash
# Start backend
python manage.py runserver

# Start frontend (separate terminal)
cd examples/demo-shell && pnpm dev

# Follow manual tests in DEMO_TEST_GUIDE.md
```

## 🔧 Current Known Issues

### Fixed Issues ✅
- Navigation sidebar flickering - **SOLVED** (moved navGroups outside component)
- TypeScript compilation errors - **SOLVED** (built all workspace packages)
- Missing auth package dist files - **SOLVED** (workspace build)

### Active Issues 🚨
- None currently known

### Monitoring 👀
- File upload performance on large files
- Theme switching performance
- Multi-tenant context switching

## 📋 Testing Checklist per Feature

### New Backend Feature Checklist
- [ ] Unit tests for models
- [ ] Unit tests for views/API endpoints
- [ ] Unit tests for services/business logic
- [ ] Integration tests with related features
- [ ] API documentation tests
- [ ] Permission/security tests
- [ ] Migration tests
- [ ] Performance tests (if applicable)

### New Frontend Feature Checklist
- [ ] Component unit tests
- [ ] Hook tests
- [ ] Integration tests with API
- [ ] Accessibility tests
- [ ] Responsive design tests
- [ ] Browser compatibility tests
- [ ] Performance tests
- [ ] Storybook stories (if applicable)

### Demo Feature Checklist
- [ ] Manual test guide created/updated
- [ ] Happy path scenarios documented
- [ ] Error scenarios documented
- [ ] Edge cases documented
- [ ] Accessibility testing
- [ ] Mobile/responsive testing
- [ ] Cross-browser testing

## 🎯 Test Coverage Goals

### Minimum Requirements
- **Backend**: 80% coverage minimum
- **Frontend**: 70% coverage minimum
- **Critical paths**: 95% coverage

### Current Coverage
- **Backend**: Check with `pytest --cov`
- **Frontend**: Check with `pnpm test -- --coverage`
- **Integration**: Manual tracking in this guide

## 📝 Test Data Management

### Test Fixtures Location
- **Backend**: `tests/fixtures/`
- **Frontend**: Individual package test directories
- **Demo Data**: `examples/*/fixtures/`

### Test Database
- Uses separate test database
- Automatically created/destroyed
- Migrations run automatically

## 🔄 Continuous Integration

### Automated Tests
- All tests run on PR creation
- Coverage reports generated
- Security scans included
- Type checking enforced

### Manual Testing Requirements
- Demo functionality testing
- Cross-browser compatibility
- Accessibility compliance
- Performance validation

## 📚 Additional Resources

### Documentation Links
- [Contributing Guidelines](docs/contributing/)
- [API Documentation](docs/api/)
- [Architecture Decisions](docs/adr/)
- [Security Guidelines](docs/security/)

### External Tools
- pytest: https://pytest.org
- Django Testing: https://docs.djangoproject.com/en/5.1/topics/testing/
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/

---

## 📅 Update Log

**2025-12-18**
- ✅ Created overall test guide
- ✅ Fixed navigation sidebar flickering
- ✅ Resolved TypeScript compilation issues
- ✅ File Management demo fully functional
- ✅ All workspace packages building correctly

**Next Updates**: Add new features as they are completed, update test status, document any new issues found.

---

**🎯 Goal**: Keep this guide as the single source of truth for testing status across the entire Django Core project.
