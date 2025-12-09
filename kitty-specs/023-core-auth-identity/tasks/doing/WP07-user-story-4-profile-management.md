---
work_package_id: "WP07"
subtasks:
  - "T075"
  - "T076"
  - "T077"
  - "T078"
  - "T079"
  - "T080"
  - "T081"
  - "T082"
  - "T083"
  - "T084"
  - "T085"
  - "T086"
  - "T087"
  - "T088"
title: "User Story 4 – Profile Management"
phase: "Phase 2 - Extended Features"
priority: "P2"
lane: "doing"
assignee: ""
agent: "claude-implementer"
shell_pid: "35160"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-08T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP07 – User Story 4: Profile Management

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[Empty initially. Reviewers will populate if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Implement profile viewing and updating: ProfilePage, ProfileForm, useUpdateProfile() hook, validation, success/error feedback.

**Success Criteria**:
- [ ] Authenticated user can navigate to /profile and view current data
- [ ] Form displays first_name, last_name (pre-populated from AuthContext)
- [ ] User can update name fields
- [ ] Updates require current_password for verification
- [ ] Success shows message via F01 Alert, updates AuthContext user data
- [ ] Validation errors display inline and in Alert
- [ ] Email is displayed as read-only with note: "Email updates require verification - coming soon"
- [ ] Password change deferred to future work (note in UI)
- [ ] All tests pass (unit + integration)
- [ ] Storybook stories demonstrate all states

**Independent Test**: Sign in → navigate to /profile → change first_name → enter current_password → submit → see success message → reload page → verify name persisted.

---

## Context & Constraints

**Prerequisites**:
- WP03 completed (AuthProvider, useCurrentUser())
- WP02 completed (PATCH /auth/profile endpoint functional)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/spec.md` - US04 requirements
- `kitty-specs/023-core-auth-identity/research.md` - B05 PATCH /auth/profile API contract
- `kitty-specs/023-core-auth-identity/plan.md` - Profile management architecture
- `.kittify/memory/constitution.md` - Principles V (Security), VII (API Design)

**Architectural Decisions**:
- **Hook Pattern**: `useUpdateProfile()` returns `{ mutate, loading, error, success }`
- **Password Requirement**: All profile updates require current_password for security
- **Partial Updates**: PATCH endpoint accepts subset of fields (first_name, last_name, current_password)
- **AuthContext Update**: Update AuthContext.user after successful profile update

**Constraints**:
- Email change deferred to phase 2 (requires email verification flow)
- Password change deferred to future work or separate form
- Require current_password for all updates (security measure)
- Generic error on incorrect password: "Current password is incorrect"

---

## Subtasks & Detailed Guidance

### Subtask T075 – Implement useUpdateProfile() Hook

**Purpose**: Create reusable hook wrapping PATCH /auth/profile.

**Steps**:
1. Create `src/hooks/useUpdateProfile.ts`
2. Import `apiClient`, `errorNormalizer`, `AuthContext`
3. Implement hook:
   ```typescript
   export const useUpdateProfile = () => {
     const { user, setUser } = useContext(AuthContext);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<ApiError | null>(null);
     const [success, setSuccess] = useState(false);

     const mutate = async (data: { first_name?: string; last_name?: string; current_password: string }) => {
       setLoading(true);
       setError(null);
       setSuccess(false);

       try {
         const response = await apiClient.patch('/auth/profile', data);
         const updatedUser = response.data.user;
         setUser(updatedUser); // Update AuthContext
         setSuccess(true);
         return updatedUser;
       } catch (err) {
         const normalizedError = errorNormalizer(err);
         setError(normalizedError);
         throw normalizedError;
       } finally {
         setLoading(false);
       }
     };

     return { mutate, loading, error, success };
   };
   ```
4. Export from `src/hooks/index.ts`

**Validation**:
- Hook returns `{ mutate, loading, error, success }`
- Calls PATCH /auth/profile with correct payload
- Updates AuthContext.user on success

**Files Modified**:
- `src/hooks/useUpdateProfile.ts` (new)
- `src/hooks/index.ts` (add export)

---

### Subtask T076 – Create ProfileForm Component

**Purpose**: Build form UI with name and password fields.

**Steps**:
1. Create `src/components/forms/ProfileForm.tsx`
2. Import F01 Input, Button, Alert
3. Import `useUpdateProfile()`, `useCurrentUser()`
4. Implement component:
   ```typescript
   export const ProfileForm: React.FC = () => {
     const { user } = useCurrentUser();
     const [firstName, setFirstName] = useState(user?.first_name || '');
     const [lastName, setLastName] = useState(user?.last_name || '');
     const [currentPassword, setCurrentPassword] = useState('');
     const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
     const { mutate, loading, error, success } = useUpdateProfile();

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();

       const errors: Record<string, string> = {};
       if (!firstName) errors.first_name = 'First name is required';
       if (!lastName) errors.last_name = 'Last name is required';
       if (!currentPassword) errors.current_password = 'Current password is required for verification';

       if (Object.keys(errors).length > 0) {
         setValidationErrors(errors);
         return;
       }

       setValidationErrors({});
       try {
         await mutate({ first_name: firstName, last_name: lastName, current_password: currentPassword });
         setCurrentPassword(''); // Clear password field on success
       } catch (err) {
         // Error handled by hook
       }
     };

     return (
       <form onSubmit={handleSubmit}>
         {success && <Alert variant="success">Profile updated successfully</Alert>}
         {error?.formErrors && <Alert variant="error">{error.formErrors.join(', ')}</Alert>}

         <Input
           label="First Name"
           value={firstName}
           onChange={(e) => setFirstName(e.target.value)}
           error={validationErrors.first_name || error?.fieldErrors.first_name?.[0]}
           disabled={loading}
           required
         />

         <Input
           label="Last Name"
           value={lastName}
           onChange={(e) => setLastName(e.target.value)}
           error={validationErrors.last_name || error?.fieldErrors.last_name?.[0]}
           disabled={loading}
           required
         />

         <Input
           label="Current Password"
           type="password"
           value={currentPassword}
           onChange={(e) => setCurrentPassword(e.target.value)}
           error={validationErrors.current_password || error?.fieldErrors.current_password?.[0]}
           disabled={loading}
           required
           helperText="Required to confirm changes"
         />

         <Button type="submit" loading={loading}>
           Update Profile
         </Button>
       </form>
     );
   };
   ```
5. Export from `src/components/forms/index.ts`

**Validation**:
- Form renders with pre-populated name fields
- Current password field is empty by default
- Success message displays after update
- Errors display correctly

**Files Modified**:
- `src/components/forms/ProfileForm.tsx` (new)
- `src/components/forms/index.ts` (add export)

---

### Subtask T077 – Pre-Populate Form with Current User Data

**Purpose**: Show existing profile data for easy editing.

**Steps**:
1. Already implemented in T076 via `useState(user?.first_name || '')`
2. Use `useCurrentUser()` from WP03 to access AuthContext.user
3. Pre-fill first_name and last_name on component mount

**Validation**:
- Form shows current user's first_name and last_name
- Empty fields if user data not available

---

### Subtask T078 – Add Validation

**Purpose**: Validate required fields before submission.

**Steps**:
1. Already implemented in T076 `handleSubmit()`
2. Validation rules:
   - first_name: required
   - last_name: required
   - current_password: required
3. Errors stored in component state, displayed via F01 Input `error` prop

**Validation**:
- Empty fields show "Required" errors
- Valid data clears errors

---

### Subtask T079 – Display Field-Level and Form-Level Errors

**Purpose**: Show clear error messages from server validation.

**Steps**:
1. Already implemented in T076
2. Field-level errors: Pass `error?.fieldErrors.field?.[0]` to Input `error` prop
3. Form-level errors: Render F01 Alert with `error?.formErrors` above form
4. Example server response (incorrect password):
   ```json
   {
     "success": false,
     "errors": {
       "current_password": ["Current password is incorrect"]
     },
     "message": "Validation failed"
   }
   ```

**Validation**:
- Field errors show inline below input
- Form errors show in Alert at top

---

### Subtask T080 – Show Success Message After Update

**Purpose**: Provide positive feedback on successful update.

**Steps**:
1. Already implemented in T076
2. Success message: "Profile updated successfully"
3. Display via F01 Alert with `variant="success"`
4. Auto-dismiss after 5 seconds (optional, via F01 Alert props)

**Validation**:
- Success message displays after update
- Message is clear and positive

---

### Subtask T081 – Update AuthContext User Data After Success

**Purpose**: Keep AuthContext in sync with backend.

**Steps**:
1. Already implemented in T075 `mutate()` via `setUser(updatedUser)`
2. Backend returns updated user object in response:
   ```json
   {
     "user": {
       "id": 1,
       "email": "user@example.com",
       "first_name": "Updated",
       "last_name": "Name",
       "email_verified": true,
       "is_active": true
     }
   }
   ```
3. Update AuthContext.user with new data

**Validation**:
- AuthContext.user reflects updated data
- UI updates immediately (no page reload needed)

---

### Subtask T082 – Create ProfilePage Component

**Purpose**: Wrap form in page layout.

**Steps**:
1. Create `src/components/pages/ProfilePage.tsx`
2. Import ProfileForm, F01 Card
3. Implement:
   ```typescript
   export const ProfilePage: React.FC = () => {
     const { user } = useCurrentUser();

     if (!user) {
       return <div>Loading...</div>; // Or redirect to sign-in
     }

     return (
       <div className={styles.container}>
         <Card>
           <h1>Profile</h1>
           <ProfileForm />

           <hr />

           <div className={styles.readOnly}>
             <h2>Email</h2>
             <p>{user.email}</p>
             <small>Email updates require verification - coming soon</small>
           </div>
         </Card>
       </div>
     );
   };
   ```
4. Export from `src/components/pages/index.ts`

**Validation**:
- Page renders ProfileForm in Card
- Email displayed as read-only

**Files Modified**:
- `src/components/pages/ProfilePage.tsx` (new)
- `src/components/pages/index.ts` (add export)

---

### Subtask T083 – Add Email Display (Read-Only)

**Purpose**: Show email with note about future verification requirement.

**Steps**:
1. Already implemented in T082
2. Display `user.email` in read-only text
3. Note: "Email updates require verification - coming soon"

**Validation**:
- Email displays correctly
- Note is visible and clear

---

### Subtask T084 – Add Password Change Section

**Purpose**: Placeholder for future password change feature.

**Steps**:
1. Option A: Add section in ProfilePage with note: "Password change - coming soon"
2. Option B: Defer entirely to future work package
3. Recommended: Add placeholder section for visibility

**Validation**:
- User knows password change feature is planned
- No functional password change form (deferred to future)

---

### Subtask T085 – Write Unit Tests for useUpdateProfile() Hook

**Purpose**: Validate hook behavior.

**Steps**:
1. Create `src/hooks/__tests__/useUpdateProfile.test.ts`
2. Test cases:
   - Success: Updates AuthContext, returns updated user
   - Incorrect password (400): Populates error state
   - Network error (500): Populates error state
   - Loading state: Toggles correctly
3. Mock `apiClient.patch`
4. Example test:
   ```typescript
   it('updates AuthContext on successful profile update', async () => {
     const updatedUser = { id: 1, first_name: 'Updated', last_name: 'Name', email: 'test@example.com' };
     (apiClient.patch as jest.Mock).mockResolvedValue({ data: { user: updatedUser } });

     const { result } = renderHook(() => useUpdateProfile(), { wrapper: AuthProvider });

     await act(async () => {
       await result.current.mutate({ first_name: 'Updated', last_name: 'Name', current_password: 'password123' });
     });

     expect(result.current.success).toBe(true);
     // Verify AuthContext updated (spy on context)
   });
   ```

**Validation**:
- All tests pass
- Coverage ≥80% for useUpdateProfile.ts

**Files Modified**:
- `src/hooks/__tests__/useUpdateProfile.test.ts` (new)

---

### Subtask T086 – Write Unit Tests for ProfileForm

**Purpose**: Validate form validation and error display.

**Steps**:
1. Create `src/components/forms/__tests__/ProfileForm.test.tsx`
2. Test cases:
   - Renders with pre-populated name fields
   - Validation: Empty first_name shows error
   - Validation: Empty current_password shows error
   - Success: Shows success message
   - Server error: Displays inline error on current_password field
   - Loading state: Inputs disabled, button shows spinner
3. Mock `useUpdateProfile()` hook

**Validation**:
- All tests pass
- Coverage ≥80% for ProfileForm.tsx

**Files Modified**:
- `src/components/forms/__tests__/ProfileForm.test.tsx` (new)

---

### Subtask T087 – Write Integration Test for Profile Update Flow

**Purpose**: Validate end-to-end profile update.

**Steps**:
1. Create `src/__tests__/integration/profileUpdateFlow.test.tsx`
2. Test flow:
   - Render ProfilePage with authenticated user
   - Verify form pre-populated with user data
   - Change first_name
   - Enter current_password
   - Submit form
   - See success message
   - Verify AuthContext.user updated
3. Mock PATCH /auth/profile with MSW

**Validation**:
- Full flow test passes

**Files Modified**:
- `src/__tests__/integration/profileUpdateFlow.test.tsx` (new)

---

### Subtask T088 – Create Storybook Stories for ProfilePage and ProfileForm

**Purpose**: Enable visual testing.

**Steps**:
1. Create `ProfilePage.stories.tsx` (default, with success, with error)
2. Create `ProfileForm.stories.tsx` (default, pre-populated, success, error, incorrect password)

**Validation**:
- All stories render correctly

**Files Modified**:
- `ProfilePage.stories.tsx` (new)
- `ProfileForm.stories.tsx` (new)

---

## Parallel Execution Strategy

**Parallel Group 1** (after WP03 complete):
- T075 (useUpdateProfile hook)
- T085 (useUpdateProfile tests)

**Parallel Group 2** (after T075 complete):
- T076-T081 (ProfileForm implementation)
- T086 (ProfileForm tests)
- T082-T084 (ProfilePage implementation)

**Parallel Group 3** (after T076, T082 complete):
- T087 (integration test)
- T088 (Storybook stories)

---

## Definition of Done

- [ ] All subtasks (T075-T088) completed
- [ ] All tests pass
- [ ] Coverage ≥80%
- [ ] Storybook builds
- [ ] Manual testing complete
- [ ] Code reviewed
- [ ] Merged to feature branch

---

## Risk Mitigation

**Risk**: Password required for all updates feels tedious
**Mitigation**: Document security reasoning, consider "Save" button only active when form changed

**Risk**: Email change complexity
**Mitigation**: Defer to phase 2, show clear "Coming soon" message

**Risk**: Form state management complexity
**Mitigation**: Use React state, clear password field on success

---

**Prompt Version**: 1.0
**Last Updated**: 2025-12-08

## Activity Log

- 2025-12-09T08:06:23Z – claude-implementer – shell_pid=35160 – lane=doing – Started implementation of Profile Management
