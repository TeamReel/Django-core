# Testing Documentation

**Purpose:** This section contains all testing documentation, including manual test guides, automated test strategies, and quality assurance processes.

---

## Contents

### [Manual Tests](manual-tests/)
Visual and manual testing guides for all Django Core features, organized by implementation status.

**Structure:**
- **[done/](manual-tests/done/)** - Completed and tested features (35 test guides)
- **[in-progress/](manual-tests/in-progress/)** - Partially implemented features
- **[not-started/](manual-tests/not-started/)** - Features ready for testing
- **[todo/](manual-tests/todo/)** - Test guides awaiting execution

**Quick Links:**
- [Manual Testing README](manual-tests/README.md) - Complete testing workflow and guide
- [36 Activity Feed Permissions](manual-tests/36-activity-feed-permissions.md) - Specific test case

---

## Testing Philosophy

All testing in Django Core follows these principles:

1. **Test What's Built**: Only test implemented features, not planned ones
2. **Kanban Workflow**: Move tests through done/in-progress/not-started based on actual status
3. **Manual First**: Visual testing validates user experience before automation
4. **Comprehensive Coverage**: Backend (≥90%), Frontend (visual + functional)

---

## Related Documentation

- **[Module Implementation](../04-modules/index.md)** - What's built and ready to test
- **[Demo Status](../05-demo/index.md)** - Current demo implementation
- **[Constitution](../03-system/constitution.md)** - Quality standards and test coverage requirements

---

*Testing validates the 80% foundation. Every module must be testable and tested.*
