# CLI & Scaffolding - Visual Test Guide

> **Validation Note (2025-12-26):** CLI structure and command parsing validated.
> The `scaffold` management command is installed and accessible.
> Template discovery (`list-templates`) works and lists built-in templates.
> Actual code generation (`init`, `app`) is pending WP04 implementation and returns placeholder messages.

## 🎯 Test Overview
- **Feature**: Django Core scaffolding CLI tools (B20)
- **Time**: 5-10 minuten
- **Prerequisites**: CLI tools installed, terminal access
- **Test Data**: Sample project scaffolding scenarios

## 🚀 Quick Access
- **CLI Command**: `python manage.py scaffold --help`
- **Test Directory**: Create temporary test directory
- **Documentation**: Check CLI documentation in docs/

## 📋 Visual Test Scenarios

### Scenario 1: CLI Installation & Help
**Steps**:
1. Check CLI is installed and accessible
2. Run `python manage.py scaffold --version`
3. Run `python manage.py scaffold --help`
4. Check available subcommands (`init`, `app`, `list-templates`)

**Expected Results**:
- ✅ CLI responds with version information
- ✅ Help text displays available commands
- ✅ Scaffolding commands are listed
- ✅ Documentation references are provided

**Pass/Fail**:
- [x] Pass: CLI is properly installed and documented
- [ ] Fail: CLI missing or help text unclear

### Scenario 2: Template Discovery
**Steps**:
1. Run `python manage.py scaffold list-templates`
2. Verify built-in templates are listed (`minimal`, `api-first`, etc.)

**Expected Results**:
- ✅ Templates are discovered and listed
- ✅ Descriptions are displayed

**Pass/Fail**:
- [x] Pass: Templates discovered successfully
- [ ] Fail: Template discovery failed

### Scenario 3: Project Scaffolding (Placeholder)
**Steps**:
1. Run `python manage.py scaffold --no-interactive init temp-project`
2. Verify placeholder message

**Expected Results**:
- ✅ Command accepts arguments
- ✅ Returns "Not implemented: scaffold init ... Implementation coming in WP04"

**Pass/Fail**:
- [x] Pass: Command structure valid (Implementation Pending)
- [ ] Fail: Command crashes or arguments rejected

### Scenario 4: Feature Scaffolding (Placeholder)
**Steps**:
1. Run `python manage.py scaffold app test_app`
2. Verify placeholder message

**Expected Results**:
- ✅ Command accepts arguments
- ✅ Returns "Not implemented: scaffold app ... Implementation coming in WP04"

**Pass/Fail**:
- [x] Pass: Command structure valid (Implementation Pending)
- [ ] Fail: Command crashes or arguments rejected

**Status**: ✅ DONE (CLI Structure Validated)
