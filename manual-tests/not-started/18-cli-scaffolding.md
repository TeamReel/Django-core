# CLI & Scaffolding - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Django Core scaffolding CLI tools (B20)
- **Time**: 12-15 minuten
- **Prerequisites**: CLI tools installed, terminal access
- **Test Data**: Sample project scaffolding scenarios

## 🚀 Quick Access
- **CLI Command**: `django-core scaffold --help`
- **Test Directory**: Create temporary test directory
- **Documentation**: Check CLI documentation in docs/

## 📋 Visual Test Scenarios

### Scenario 1: CLI Installation & Help
**Steps**:
1. Check CLI is installed and accessible
2. Run `django-core --version`
3. Run `django-core --help`
4. Check available subcommands

**Expected Results**:
- ✅ CLI responds with version information
- ✅ Help text displays available commands
- ✅ Scaffolding commands are listed
- ✅ Documentation references are provided

**Pass/Fail**:
- [ ] Pass: CLI is properly installed and documented
- [ ] Fail: CLI missing or help text unclear

### Scenario 2: Project Scaffolding
**Steps**:
1. Create new test directory
2. Run `django-core scaffold project test-project`
3. Check generated project structure
4. Verify generated files are correct

**Expected Results**:
- ✅ Project directory created with correct structure
- ✅ Django settings configured appropriately
- ✅ Dependencies listed in requirements files
- ✅ Documentation generated for new project

**Pass/Fail**:
- [ ] Pass: Project scaffolding generates working project
- [ ] Fail: Scaffolding fails or generates incorrect structure

### Scenario 3: Feature Scaffolding
**Steps**:
1. In existing project, run feature scaffolding
2. Test generation of new Django app
3. Check API endpoint scaffolding
4. Verify frontend component scaffolding

**Expected Results**:
- ✅ New Django apps generated with proper structure
- ✅ API endpoints follow project conventions
- ✅ Frontend components match design system
- ✅ Tests generated for scaffolded code

**Pass/Fail**:
- [ ] Pass: Feature scaffolding maintains project consistency
- [ ] Fail: Generated code doesn't match conventions

**Status**: 🔴 NOT STARTED - Future Feature
