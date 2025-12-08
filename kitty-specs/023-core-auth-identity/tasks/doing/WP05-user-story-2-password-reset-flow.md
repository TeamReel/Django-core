---
work_package_id: "WP05"
subtasks:
  - "T046"
  - "T047"
  - "T048"
  - "T049"
  - "T050"
  - "T051"
  - "T052"
  - "T053"
  - "T054"
  - "T055"
  - "T056"
  - "T057"
  - "T058"
  - "T059"
  - "T060"
  - "T061"
  - "T062"
  - "T063"
  - "T064"
  - "T065"
title: "User Story 2 – Password Reset Flow"
phase: "Phase 1 - Core Auth Flows"
priority: "P1"
mvp: true
lane: "doing"
assignee: "Claude"
agent: "claude"
shell_pid: "35160"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-08T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-08T23:10:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "35160"
    action: "Started WP05: Password Reset Flow implementation. Will implement request + confirm pages, hooks, and validation following US02 requirements."
---

# Work Package Prompt: WP05 – User Story 2: Password Reset Flow

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

**Goal**: Implement password reset request and confirmation flows: RequestPasswordResetPage, ConfirmPasswordResetPage, forms, hooks, validation.

**Success Criteria**:
- [ ] User can navigate to `/auth/password-reset` and request password reset
- [ ] Request form accepts email, always shows generic success message (no email enumeration)
- [ ] User can navigate to `/auth/password-reset-confirm/<uidb64>/<token>` and set new password
- [ ] Confirm form validates password strength and matching confirmation
- [ ] Expired/invalid tokens show clear error message with link to request new reset
- [ ] Success shows message with link to sign-in page
- [ ] All tests pass (unit + integration)
- [ ] Storybook stories demonstrate all states

**Independent Test**: Request password reset → receive email link (simulated in test) → click link → set new password → redirect to sign-in → sign in with new password successfully.

---

## Context & Constraints

**Prerequisites**:
- WP03 completed (AuthProvider, apiClient, errorNormalizer)
- WP02 completed (POST /auth/password-reset, POST /auth/password-reset-confirm endpoints)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/spec.md` - US02 requirements
- `kitty-specs/023-core-auth-identity/research.md` - B05 password reset API contract
- `kitty-specs/023-core-auth-identity/plan.md` - Password validation rules
- `.kittify/memory/constitution.md` - Principles IV (Testing), V (Security)

**Architectural Decisions**:
- **Two-step flow**: Request (POST /auth/password-reset) → Confirm (POST /auth/password-reset-confirm)
- **No email enumeration**: Always return generic success on request, regardless of email existence
- **Token validation**: Backend validates uidb64 + token, frontend displays clear errors
- **Password rules**: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (match B05)

**Constraints**:
- Generic success message: "If that email exists, a password reset link has been sent"
- Token errors: "This reset link is invalid or has expired. Please request a new one."
- Password validation must match backend rules exactly
- One-time token use (backend enforces)

---

## Subtasks & Detailed Guidance

### Subtask T046 – Implement useRequestPasswordReset() Hook

**Purpose**: Create hook wrapping POST /auth/password-reset.

**Steps**:
1. Create `src/hooks/useRequestPasswordReset.ts`
2. Implement hook:
   ```typescript
   export const useRequestPasswordReset = () => {
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<ApiError | null>(null);
     const [success, setSuccess] = useState(false);

     const mutate = async (email: string) => {
       setLoading(true);
       setError(null);
       setSuccess(false);
       try {
         await apiClient.post('/auth/password-reset', { email });
         setSuccess(true);
       } catch (err) {
         const normalizedError = errorNormalizer(err);
         setError(normalizedError);
       } finally {
         setLoading(false);
       }
     };

     return { mutate, loading, error, success };
   };
   ```
3. Export from `src/hooks/index.ts`

**Validation**:
- Hook returns `{ mutate, loading, error, success }`
- Calls POST /auth/password-reset with email
- Sets success=true regardless of email existence (backend returns 200 always)

**Files Modified**:
- `src/hooks/useRequestPasswordReset.ts` (new)
- `src/hooks/index.ts` (add export)

---

### Subtask T047 – Create RequestPasswordResetForm Component

**Purpose**: Build form UI with email field.

**Steps**:
1. Create `src/components/forms/RequestPasswordResetForm.tsx`
2. Import F01 Input, Button, Alert
3. Import `useRequestPasswordReset()`
4. Implement component:
   ```typescript
   export const RequestPasswordResetForm: React.FC = () => {
     const [email, setEmail] = useState('');
     const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
     const { mutate, loading, error, success } = useRequestPasswordReset();

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();

       const errors: Record<string, string> = {};
       if (!email) errors.email = 'Email is required';
       else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';

       if (Object.keys(errors).length > 0) {
         setValidationErrors(errors);
         return;
       }

       setValidationErrors({});
       await mutate(email);
     };

     if (success) {
       return (
         <Alert variant="success">
           If that email exists, a password reset link has been sent. Check your inbox.
         </Alert>
       );
     }

     return (
       <form onSubmit={handleSubmit}>
         {error?.formErrors && <Alert variant="error">{error.formErrors.join(', ')}</Alert>}

         <Input
           label="Email"
           type="email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           error={validationErrors.email || error?.fieldErrors.email?.[0]}
           disabled={loading}
           required
         />

         <Button type="submit" loading={loading}>
           Send Reset Link
         </Button>
       </form>
     );
   };
   ```
5. Export from `src/components/forms/index.ts`

**Validation**:
- Form renders with email input
- Success shows generic message
- Errors display correctly

**Files Modified**:
- `src/components/forms/RequestPasswordResetForm.tsx` (new)
- `src/components/forms/index.ts` (add export)

---

### Subtask T048 – Add Client-Side Email Validation

**Purpose**: Validate email format before submission.

**Steps**:
1. Already implemented in T047 `handleSubmit()`
2. Validation: required, regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**Validation**:
- Empty email shows "Required" error
- Invalid format shows "Invalid email format"

---

### Subtask T049 – Display Generic Success Message

**Purpose**: Prevent email enumeration attacks.

**Steps**:
1. Already implemented in T047
2. Message: "If that email exists, a password reset link has been sent. Check your inbox."
3. Show regardless of whether email exists in database

**Validation**:
- Message always shows after successful request
- Never reveals if email exists or not

---

### Subtask T050 – Create RequestPasswordResetPage Component

**Purpose**: Wrap form in page layout.

**Steps**:
1. Create `src/components/pages/RequestPasswordResetPage.tsx`
2. Implement:
   ```typescript
   export const RequestPasswordResetPage: React.FC = () => {
     return (
       <div className={styles.container}>
         <Card>
           <h1>Reset Password</h1>
           <p>Enter your email to receive a password reset link.</p>
           <RequestPasswordResetForm />
           <a href="/auth/login">Back to sign in</a>
         </Card>
       </div>
     );
   };
   ```
3. Export from `src/components/pages/index.ts`

**Validation**:
- Page renders form in Card
- "Back to sign in" link navigates to `/auth/login`

**Files Modified**:
- `src/components/pages/RequestPasswordResetPage.tsx` (new)
- `src/components/pages/index.ts` (add export)

---

### Subtask T051 – Implement useConfirmPasswordReset() Hook

**Purpose**: Create hook wrapping POST /auth/password-reset-confirm.

**Steps**:
1. Create `src/hooks/useConfirmPasswordReset.ts`
2. Implement:
   ```typescript
   export const useConfirmPasswordReset = () => {
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<ApiError | null>(null);
     const [success, setSuccess] = useState(false);

     const mutate = async (uidb64: string, token: string, new_password: string, confirm_password: string) => {
       setLoading(true);
       setError(null);
       setSuccess(false);
       try {
         await apiClient.post('/auth/password-reset-confirm', {
           uidb64,
           token,
           new_password,
           confirm_password,
         });
         setSuccess(true);
       } catch (err) {
         const normalizedError = errorNormalizer(err);
         setError(normalizedError);
       } finally {
         setLoading(false);
       }
     };

     return { mutate, loading, error, success };
   };
   ```
3. Export from `src/hooks/index.ts`

**Validation**:
- Hook calls POST /auth/password-reset-confirm with correct payload
- Sets success=true on 200 OK
- Sets error on 400/404 (invalid token)

**Files Modified**:
- `src/hooks/useConfirmPasswordReset.ts` (new)
- `src/hooks/index.ts` (add export)

---

### Subtask T052 – Create ConfirmPasswordResetForm Component

**Purpose**: Build form with password and confirmation fields.

**Steps**:
1. Create `src/components/forms/ConfirmPasswordResetForm.tsx`
2. Accept props: `uidb64: string`, `token: string`
3. Implement:
   ```typescript
   export interface ConfirmPasswordResetFormProps {
     uidb64: string;
     token: string;
   }

   export const ConfirmPasswordResetForm: React.FC<ConfirmPasswordResetFormProps> = ({ uidb64, token }) => {
     const [newPassword, setNewPassword] = useState('');
     const [confirmPassword, setConfirmPassword] = useState('');
     const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
     const { mutate, loading, error, success } = useConfirmPasswordReset();

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();

       const errors: Record<string, string> = {};
       if (!newPassword) errors.new_password = 'Password is required';
       else if (newPassword.length < 8) errors.new_password = 'Password must be at least 8 characters';
       else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
         errors.new_password = 'Password must include uppercase, lowercase, number, and special character';
       }
       if (!confirmPassword) errors.confirm_password = 'Please confirm your password';
       else if (newPassword !== confirmPassword) errors.confirm_password = 'Passwords do not match';

       if (Object.keys(errors).length > 0) {
         setValidationErrors(errors);
         return;
       }

       setValidationErrors({});
       await mutate(uidb64, token, newPassword, confirmPassword);
     };

     if (success) {
       return (
         <Alert variant="success">
           Password reset successful! <a href="/auth/login">Sign in now</a>
         </Alert>
       );
     }

     return (
       <form onSubmit={handleSubmit}>
         {error?.formErrors && <Alert variant="error">{error.formErrors.join(', ')}</Alert>}

         <Input
           label="New Password"
           type="password"
           value={newPassword}
           onChange={(e) => setNewPassword(e.target.value)}
           error={validationErrors.new_password || error?.fieldErrors.new_password?.[0]}
           disabled={loading}
           required
         />

         <Input
           label="Confirm Password"
           type="password"
           value={confirmPassword}
           onChange={(e) => setConfirmPassword(e.target.value)}
           error={validationErrors.confirm_password || error?.fieldErrors.confirm_password?.[0]}
           disabled={loading}
           required
         />

         <Button type="submit" loading={loading}>
           Reset Password
         </Button>
       </form>
     );
   };
   ```
4. Export from `src/components/forms/index.ts`

**Validation**:
- Form renders with two password fields
- Success shows message with link to sign-in
- Errors display correctly

**Files Modified**:
- `src/components/forms/ConfirmPasswordResetForm.tsx` (new)
- `src/components/forms/index.ts` (add export)

---

### Subtask T053 – Add Client-Side Password Validation

**Purpose**: Validate password strength.

**Steps**:
1. Already implemented in T052
2. Rules:
   - Min 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character (@$!%*?&)
3. Regex: `/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/`

**Validation**:
- Weak passwords show validation error
- Strong passwords pass validation

---

### Subtask T054 – Add Password Confirmation Matching Validation

**Purpose**: Ensure user typed password correctly.

**Steps**:
1. Already implemented in T052
2. Validation: `newPassword !== confirmPassword` → error

**Validation**:
- Mismatched passwords show "Passwords do not match"
- Matching passwords pass validation

---

### Subtask T055 – Display Password Strength Indicator

**Purpose**: Visual feedback for password strength (optional).

**Steps**:
1. Defer to phase 2 or mark as optional enhancement
2. If implementing: Use F01 ProgressBar or custom indicator
3. Calculate strength: weak (8 chars), medium (+ upper/lower), strong (+ number + special)

**Validation**:
- Indicator updates as user types
- Shows weak/medium/strong labels

---

### Subtask T056 – Create ConfirmPasswordResetPage Component

**Purpose**: Wrap form in page layout.

**Steps**:
1. Create `src/components/pages/ConfirmPasswordResetPage.tsx`
2. Extract uidb64 and token from URL params
3. Implement:
   ```typescript
   export const ConfirmPasswordResetPage: React.FC = () => {
     const { uidb64, token } = useParams<{ uidb64: string; token: string }>();

     if (!uidb64 || !token) {
       return (
         <Card>
           <Alert variant="error">
             Invalid password reset link. <a href="/auth/password-reset">Request a new one</a>
           </Alert>
         </Card>
       );
     }

     return (
       <div className={styles.container}>
         <Card>
           <h1>Set New Password</h1>
           <ConfirmPasswordResetForm uidb64={uidb64} token={token} />
         </Card>
       </div>
     );
   };
   ```
4. Export from `src/components/pages/index.ts`

**Validation**:
- Page extracts params from URL
- Shows error if params missing

**Files Modified**:
- `src/components/pages/ConfirmPasswordResetPage.tsx` (new)
- `src/components/pages/index.ts` (add export)

---

### Subtask T057 – Extract uidb64 and Token from URL Params

**Purpose**: Read reset token from URL.

**Steps**:
1. Already implemented in T056
2. Use React Router's `useParams<{ uidb64: string; token: string }>()`
3. Pass to ConfirmPasswordResetForm as props

**Validation**:
- Params extracted correctly
- Missing params handled gracefully

---

### Subtask T058 – Handle Expired/Invalid Token Errors

**Purpose**: Show clear error when token is invalid.

**Steps**:
1. Backend returns 400 with error: "Invalid or expired token"
2. errorNormalizer converts to formErrors
3. Display in Alert: "This reset link is invalid or has expired. <a href='/auth/password-reset'>Request a new one</a>"

**Validation**:
- Expired token shows clear message
- Link to request new reset works

---

### Subtask T059 – Show Success Message with Link to Sign-In

**Purpose**: Guide user to sign in after reset.

**Steps**:
1. Already implemented in T052
2. Success message: "Password reset successful! <a href='/auth/login'>Sign in now</a>"

**Validation**:
- Success message displays
- Link navigates to sign-in page

---

### Subtask T060 – Write Unit Tests for useRequestPasswordReset() Hook

**Purpose**: Validate request hook.

**Steps**:
1. Create `src/hooks/__tests__/useRequestPasswordReset.test.ts`
2. Test cases:
   - Success: Sets success=true, loading=false
   - Network error: Sets error state
   - Loading state toggles correctly
3. Mock apiClient

**Validation**:
- All tests pass
- Coverage ≥80%

**Files Modified**:
- `src/hooks/__tests__/useRequestPasswordReset.test.ts` (new)

---

### Subtask T061 – Write Unit Tests for useConfirmPasswordReset() Hook

**Purpose**: Validate confirm hook.

**Steps**:
1. Create `src/hooks/__tests__/useConfirmPasswordReset.test.ts`
2. Test cases:
   - Success: Sets success=true
   - Invalid token (400): Sets error state
   - Password validation error (400): Sets error with field errors
3. Mock apiClient

**Validation**:
- All tests pass
- Coverage ≥80%

**Files Modified**:
- `src/hooks/__tests__/useConfirmPasswordReset.test.ts` (new)

---

### Subtask T062 – Write Unit Tests for RequestPasswordResetForm

**Purpose**: Validate request form.

**Steps**:
1. Create `src/components/forms/__tests__/RequestPasswordResetForm.test.tsx`
2. Test cases:
   - Renders email input
   - Validation: Empty email shows error
   - Validation: Invalid email format shows error
   - Success: Shows generic success message
   - Loading state: Input disabled, button shows spinner

**Validation**:
- All tests pass
- Coverage ≥80%

**Files Modified**:
- `src/components/forms/__tests__/RequestPasswordResetForm.test.tsx` (new)

---

### Subtask T063 – Write Unit Tests for ConfirmPasswordResetForm

**Purpose**: Validate confirm form.

**Steps**:
1. Create `src/components/forms/__tests__/ConfirmPasswordResetForm.test.tsx`
2. Test cases:
   - Renders password fields
   - Validation: Short password shows error
   - Validation: Weak password (no special char) shows error
   - Validation: Passwords don't match shows error
   - Success: Shows success message with link

**Validation**:
- All tests pass
- Coverage ≥80%

**Files Modified**:
- `src/components/forms/__tests__/ConfirmPasswordResetForm.test.tsx` (new)

---

### Subtask T064 – Write Integration Test for Complete Password Reset Flow

**Purpose**: Validate end-to-end password reset.

**Steps**:
1. Create `src/__tests__/integration/passwordResetFlow.test.tsx`
2. Test flow:
   - Render RequestPasswordResetPage
   - Submit email
   - See success message
   - Navigate to ConfirmPasswordResetPage with uidb64/token
   - Submit new password
   - See success message
   - Navigate to SignInPage
   - Sign in with new password
3. Mock both POST /auth/password-reset and POST /auth/password-reset-confirm

**Validation**:
- Full flow test passes

**Files Modified**:
- `src/__tests__/integration/passwordResetFlow.test.tsx` (new)

---

### Subtask T065 – Create Storybook Stories for Both Pages and Forms

**Purpose**: Enable visual testing.

**Steps**:
1. Create `RequestPasswordResetPage.stories.tsx` (default, with error)
2. Create `RequestPasswordResetForm.stories.tsx` (default, success, error)
3. Create `ConfirmPasswordResetPage.stories.tsx` (default, invalid token, with error)
4. Create `ConfirmPasswordResetForm.stories.tsx` (default, success, error, mismatched passwords)

**Validation**:
- All stories render correctly

**Files Modified**:
- Multiple `.stories.tsx` files (new)

---

## Definition of Done

- [ ] All subtasks (T046-T065) completed
- [ ] All tests pass
- [ ] Coverage ≥80%
- [ ] Storybook builds
- [ ] Manual testing complete
- [ ] Code reviewed
- [ ] Merged to feature branch

---

**Prompt Version**: 1.0
**Last Updated**: 2025-12-08
