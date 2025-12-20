# Projects Management - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Project creation and management within organizations
- **Time**: 10-12 minuten
- **Prerequisites**: Organization context set, project management permissions
- **Test Data**: Multiple projects in different organizations

## 🚀 Quick Access
- **Projects API**: http://localhost:8000/api/v1/projects/
- **Demo Shell**: Navigate after setting organization context
- **Direct Access**: Depends on implementation (may be integrated in org pages)

## 📋 Visual Test Scenarios

### Scenario 1: Project List View
**Steps**:
1. Set organization context
2. Navigate to projects section
3. View project list for current organization
4. Check project information display

**Expected Results**:
- ✅ Projects filtered by current organization
- ✅ Project cards/list show: name, description, created date
- ✅ Project status indicators (active, archived, etc.)
- ✅ Action buttons (view, edit, delete) based on permissions

**Pass/Fail**:
- [ ] Pass: Clear project overview within organization
- [ ] Fail: Projects not filtered by org or missing information

### Scenario 2: Create New Project
**Steps**:
1. Click "Add/Create Project" button
2. Fill out project creation form
3. Submit and verify creation
4. Check project appears in organization's project list

**Expected Results**:
- ✅ Project creation form with required fields
- ✅ Organization context automatically set for new project
- ✅ Form validation (name required, no duplicates in org)
- ✅ Success message and redirect to new project

**Pass/Fail**:
- [ ] Pass: Project creation works within organization context
- [ ] Fail: Form errors, wrong organization, or creation fails

### Scenario 3: Project Details View
**Steps**:
1. Click on a project to view details
2. Check project information completeness
3. Review project members/permissions
4. Test project-specific features

**Expected Results**:
- ✅ Complete project information display
- ✅ Project settings and configuration options
- ✅ List of project members with their roles
- ✅ Project-specific data (files, tasks, etc.)

**Pass/Fail**:
- [ ] Pass: Comprehensive project details view
- [ ] Fail: Missing information or broken functionality

### Scenario 4: Edit Project Settings
**Steps**:
1. Access project edit/settings page
2. Modify project information
3. Update project permissions/members
4. Save changes and verify updates

**Expected Results**:
- ✅ Edit form pre-populated with current project data
- ✅ All project settings are editable
- ✅ Changes save successfully with confirmation
- ✅ Project list reflects updated information

**Pass/Fail**:
- [ ] Pass: Project editing works without issues
- [ ] Fail: Edit functionality broken or data not saved

### Scenario 5: Project Member Management
**Steps**:
1. Access project member management
2. Add new member to project
3. Modify member roles within project
4. Remove member from project

**Expected Results**:
- ✅ Member list shows current project members
- ✅ Add member functionality (from organization members)
- ✅ Role assignment works (admin, member, viewer, etc.)
- ✅ Member removal with appropriate confirmations

**Pass/Fail**:
- [ ] Pass: Complete project member management
- [ ] Fail: Member operations fail or permissions issues

### Scenario 6: Project Context Data Filtering
**Steps**:
1. Switch between different projects
2. Check that data (files, tasks, etc.) filters by project
3. Verify project-specific features work correctly
4. Test data isolation between projects

**Expected Results**:
- ✅ Data completely changes when switching projects
- ✅ Files/resources filtered by current project
- ✅ No data leakage between different projects
- ✅ Project-specific navigation/features update

**Pass/Fail**:
- [ ] Pass: Perfect project-level data isolation
- [ ] Fail: Data leakage or project context confusion

### Scenario 7: Archive/Delete Project
**Steps**:
1. Test project archiving (if implemented)
2. Attempt project deletion
3. Handle deletion warnings and confirmations
4. Verify project removal and data cleanup

**Expected Results**:
- ✅ Archive option preserves data but hides project
- ✅ Delete shows clear warnings about data loss
- ✅ Confirmation process prevents accidental deletion
- ✅ Project removal completes successfully

**Pass/Fail**:
- [ ] Pass: Safe project lifecycle management
- [ ] Fail: Unsafe deletion or data corruption

### Scenario 8: Cross-Organization Project Access
**Steps**:
1. Create projects in different organizations
2. Switch organization context
3. Verify projects are properly isolated by organization
4. Check that project access respects organization membership

**Expected Results**:
- ✅ Projects only visible within their parent organization
- ✅ Switching organizations shows different project sets
- ✅ No cross-organization project access
- ✅ Project permissions respect organization membership

**Pass/Fail**:
- [ ] Pass: Perfect organization-level project isolation
- [ ] Fail: Cross-organization access or security issues

## 🐛 Troubleshooting

### Projects Not Showing
- **Check**: Organization context is set correctly
- **Check**: User has permissions to view projects in current org
- **Check**: Projects exist in database for current organization
- **Check**: API filtering by organization is working

### Project Creation Fails
- **Check**: User has project creation permissions
- **Check**: Organization context is properly passed to API
- **Check**: Required fields are validated correctly
- **Check**: Database foreign key constraints are satisfied

### Data Filtering Issues
- **Check**: Project context is being sent in API requests
- **Check**: Backend models include project foreign keys
- **Check**: Multi-tenancy filtering includes project-level isolation
- **Check**: Frontend state management tracks current project

### Member Management Problems
- **Check**: User has admin permissions for current project
- **Check**: Member invitation/addition system is working
- **Check**: Project role system is configured correctly
- **Check**: Organization membership requirements are enforced

## ✅ Success Criteria

Projects test succesvol als:
- Projects can be created, viewed, and managed within organization context
- Project data is completely isolated between projects and organizations
- Member management works at both organization and project levels
- Project lifecycle (create, edit, archive, delete) works safely
- Context switching properly filters all project-related data
- Permission system works at project level while respecting organization boundaries

**Status**: 🟡 TODO - Ready to Test
