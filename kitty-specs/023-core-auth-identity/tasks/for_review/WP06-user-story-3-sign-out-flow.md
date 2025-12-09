---
work_package_id: "WP06"
subtasks:
  - "T066"
  - "T067"
  - "T068"
  - "T069"
  - "T070"
  - "T071"
  - "T072"
  - "T073"
  - "T074"
title: "User Story 3 – Sign-Out Flow"
phase: "Phase 1 - Core Auth Flows"
priority: "P1"
mvp: true
lane: "for_review"
assignee: ""
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
---

# Work Package Prompt: WP06 – User Story 3: Sign-Out Flow

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

**Goal**: Implement sign-out functionality: useSignOut() hook, session clearing, redirect to public page, prevent back-button access.

**Success Criteria**:
- [ ] Authenticated user can trigger sign-out action
- [ ] POST /auth/logout is called successfully
- [ ] AuthContext state is cleared (user=null, status=unauthenticated)
- [ ] User is redirected to config.routes.afterLogout (default: "/")
- [ ] Attempting to access protected routes after sign-out redirects to sign-in
- [ ] Loading state prevents duplicate sign-out requests
- [ ] Network failures handled gracefully (state cleared regardless)
- [ ] All tests pass (unit + integration)

**Independent Test**: Sign in → navigate to /profile → trigger sign-out → redirect to / → attempt to access /profile → redirect to /auth/login?next=/profile

---

## Context & Constraints

**Prerequisites**:
- WP03 completed (AuthProvider, apiClient)
- WP02 completed (POST /auth/logout endpoint functional)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/spec.md` - US03 requirements
- `kitty-specs/023-core-auth-identity/research.md` - B05 /auth/logout API contract
- `kitty-specs/023-core-auth-identity/plan.md` - Session management architecture
- `.kittify/memory/constitution.md` - Principles V (Security), VI (Performance)

**Architectural Decisions**:
- **Hook Pattern**: `useSignOut()` returns `{ signOut, loading, error }`
- **State Clearing**: Clear AuthContext immediately before redirect (prevent flash of authenticated UI)
- **Error Handling**: 401 response (already logged out) treated as success
- **Redirect**: Use config.routes.afterLogout (default: "/")

**Constraints**:
- Backend returns 204 No Content on success (no response body)
- Must handle 401 response (already logged out) gracefully
- Loading state prevents double sign-out
- Clear state even on network failure (local state is authoritative)

---

## Subtasks & Detailed Guidance

### Subtask T066 – Implement useSignOut() Hook

**Purpose**: Create reusable hook wrapping POST /auth/logout logic.

**Steps**:
1. Create `src/hooks/useSignOut.ts`
2. Import `apiClient`, `AuthContext`
3. Implement hook:
   ```typescript
   export const useSignOut = () => {
     const { clearAuth, config } = useContext(AuthContext);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<ApiError | null>(null);

     const signOut = async () => {
       setLoading(true);
       setError(null);

       try {
         await apiClient.post('/auth/logout', {});
       } catch (err) {
         // Handle 401 (already logged out) as success
         if (err.status === 401) {
           // Already logged out, clear state anyway
         } else {
           // Network error or other failure
           const normalizedError = errorNormalizer(err);
           setError(normalizedError);
           // Still clear state and redirect (local state is authoritative)
         }
       } finally {
         // Always clear state and redirect
         clearAuth();
         setLoading(false);
         window.location.href = config.routes.afterLogout || '/';
       }
     };

     return { signOut, loading, error };
   };
   ```
4. Export from `src/hooks/index.ts`

**Validation**:
- Hook returns `{ signOut, loading, error }`
- Calls POST /auth/logout
- Clears AuthContext regardless of response
- Redirects to config.routes.afterLogout

**Files Modified**:
- `src/hooks/useSignOut.ts` (new)
- `src/hooks/index.ts` (add export)

---

### Subtask T067 – Clear AuthContext State in useSignOut()

**Purpose**: Reset authentication state to unauthenticated.

**Steps**:
1. Already implemented in T066
2. Call `clearAuth()` from AuthContext
3. clearAuth() implementation (in WP03 AuthProvider):
   ```typescript
   const clearAuth = () => {
     setUser(null);
     setStatus('unauthenticated');
     setError(null);
     setLastVerified(null);
   };
   ```
4. Clear state before redirect to prevent flash of authenticated UI

**Validation**:
- AuthContext.user is null after sign-out
- AuthContext.status is 'unauthenticated'
- Protected routes redirect to sign-in after sign-out

---

### Subtask T068 – Redirect to config.routes.afterLogout After Sign-Out

**Purpose**: Navigate user to safe public page after sign-out.

**Steps**:
1. Already implemented in T066
2. Use `window.location.href` for hard redirect (clears all state)
3. Default: `config.routes.afterLogout = '/'`
4. User can override in AuthProvider config

**Validation**:
- Redirect to "/" by default
- Respects custom config.routes.afterLogout if set

---

### Subtask T069 – Handle Sign-Out Errors Gracefully

**Purpose**: Ensure sign-out succeeds even on network failure.

**Steps**:
1. Already implemented in T066
2. Error handling logic:
   - 401 (already logged out) → treat as success, clear state
   - Network error → log error, but still clear state and redirect
   - Local state is authoritative (don't trust server)
3. Show error to user optionally (via toast/alert), but don't block redirect

**Validation**:
- Network failure still clears state and redirects
- 401 response doesn't show error to user
- Other errors logged but don't block sign-out

---

### Subtask T070 – Add Loading State During Sign-Out

**Purpose**: Prevent double sign-out and provide visual feedback.

**Steps**:
1. Already implemented in T066 via `loading` state
2. Disable sign-out button during loading: `<Button disabled={loading} loading={loading}>Sign Out</Button>`
3. Prevent multiple simultaneous sign-out requests

**Validation**:
- Button shows spinner when loading
- Button disabled during loading
- Multiple clicks don't trigger duplicate requests

---

### Subtask T071 – Write Unit Tests for useSignOut() Hook

**Purpose**: Validate hook behavior.

**Steps**:
1. Create `src/hooks/__tests__/useSignOut.test.ts`
2. Test cases:
   - Success (204): Clears AuthContext, redirects to /
   - Already logged out (401): Clears AuthContext, redirects, no error
   - Network error (500): Clears AuthContext, redirects, logs error
   - Loading state: Toggles correctly during request
3. Mock `apiClient.post` and `window.location.href`
4. Example test:
   ```typescript
   it('clears AuthContext and redirects on success', async () => {
     (apiClient.post as jest.Mock).mockResolvedValue({ status: 204 });
     delete window.location;
     window.location = { href: '' } as any;

     const { result } = renderHook(() => useSignOut(), { wrapper: AuthProvider });

     await act(async () => {
       await result.current.signOut();
     });

     expect(window.location.href).toBe('/');
     // Verify AuthContext cleared (spy on context)
   });
   ```

**Validation**:
- All tests pass
- Coverage ≥80% for useSignOut.ts

**Files Modified**:
- `src/hooks/__tests__/useSignOut.test.ts` (new)

---

### Subtask T072 – Write Integration Test for Sign-Out Flow

**Purpose**: Validate complete sign-out journey.

**Steps**:
1. Create `src/__tests__/integration/signOutFlow.test.tsx`
2. Test flow:
   - Sign in user (set AuthContext to authenticated)
   - Render protected page (e.g., /profile)
   - Trigger sign-out
   - Verify redirect to /
   - Attempt to access /profile
   - Verify redirect to /auth/login?next=/profile
3. Mock POST /auth/logout with MSW
4. Example test:
   ```typescript
   it('signs out and redirects to public page', async () => {
     server.use(
       rest.post('/api/v1/auth/logout', (req, res, ctx) => {
         return res(ctx.status(204));
       })
     );

     const { getByText } = render(
       <AuthProvider config={testConfig} initialUser={mockUser}>
         <MemoryRouter initialEntries={['/profile']}>
           <Routes>
             <Route path="/profile" element={<ProfilePage />} />
             <Route path="/" element={<HomePage />} />
           </Routes>
         </MemoryRouter>
       </AuthProvider>
     );

     fireEvent.click(getByText('Sign Out'));

     await waitFor(() => {
       expect(getByText('Home')).toBeInTheDocument();
     });
   });
   ```

**Validation**:
- Test passes
- Covers authenticated → sign-out → unauthenticated → protected route redirect

**Files Modified**:
- `src/__tests__/integration/signOutFlow.test.tsx` (new)

---

### Subtask T073 – Update AuthProvider to Expose signOut Method

**Purpose**: Make signOut accessible via AuthContext.

**Steps**:
1. Update AuthProvider (from WP03) to include `signOut` in context value
2. Modify AuthContext type:
   ```typescript
   interface AuthContextValue {
     user: User | null;
     status: AuthStatus;
     isLoading: boolean;
     error: ApiError | null;
     lastVerified: Date | null;
     signOut: () => Promise<void>;
   }
   ```
3. Provide `signOut` from useSignOut() in AuthProvider:
   ```typescript
   const AuthProvider: React.FC<AuthProviderProps> = ({ children, config }) => {
     const [user, setUser] = useState<User | null>(null);
     const [status, setStatus] = useState<AuthStatus>('loading');
     // ... other state

     const { signOut } = useSignOut(); // Import hook

     const contextValue = {
       user,
       status,
       // ... other values
       signOut,
     };

     return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
   };
   ```

**Validation**:
- `useAuth()` hook exposes `signOut` function
- Components can call `const { signOut } = useAuth()` and trigger sign-out

**Files Modified**:
- `src/components/AuthProvider.tsx` (update from WP03)
- `src/types/AuthContext.ts` (update interface)

---

### Subtask T074 – Test Back-Button Behavior After Sign-Out

**Purpose**: Ensure cached authenticated pages don't show after sign-out.

**Steps**:
1. Manual test:
   - Sign in → navigate to /profile → sign out → click back button
   - Verify: Either redirected to sign-in or shown public page (no cached profile data)
2. Implementation: Use `window.location.href` for hard redirect (clears browser cache)
3. Alternative: Add `Cache-Control: no-store` headers to protected pages (backend responsibility)

**Validation**:
- Back button after sign-out doesn't show authenticated content
- User is redirected to sign-in if accessing protected route

**Note**: This is primarily a backend responsibility (session cookie deletion + cache headers), but frontend should use hard redirect to clear client state.

---

## Parallel Execution Strategy

**Sequential**:
- T066-T070 (hook implementation)
- T073 (AuthProvider update)
- T071-T072 (tests)
- T074 (manual test)

---

## Testing & Validation Checklist

**Unit Tests**:
- [ ] `useSignOut.test.ts` - All cases pass (success, 401, error, loading)
- [ ] Coverage ≥80% for `useSignOut.ts`

**Integration Tests**:
- [ ] `signOutFlow.test.tsx` - Complete flow passes (sign-out → redirect → protected route check)

**Manual Testing**:
- [ ] Sign in → sign out → redirect to /
- [ ] Sign out → attempt /profile → redirect to /auth/login?next=/profile
- [ ] Sign out with network error → still redirects
- [ ] Click sign-out button multiple times → only one request
- [ ] Back button after sign-out → no cached authenticated content
- [ ] Sign out from different pages → always redirects to config.routes.afterLogout

---

## Definition of Done

- [ ] All subtasks (T066-T074) completed
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Coverage ≥80% for new files
- [ ] Manual testing checklist complete
- [ ] Code reviewed and approved
- [ ] Merged to feature branch `023-core-auth-identity`

---

## Risk Mitigation

**Risk**: Flash of authenticated UI before redirect
**Mitigation**: Clear AuthContext state before redirect, use synchronous clearAuth() call

**Risk**: Network failure prevents sign-out
**Mitigation**: Always clear local state and redirect, even on error (local state is authoritative)

**Risk**: Double sign-out requests
**Mitigation**: Add loading state, disable button during request

**Risk**: Cached authenticated pages accessible via back button
**Mitigation**: Use window.location.href for hard redirect, rely on backend session deletion

---

## Notes for Implementer

- **State clearing**: Always clear local state, regardless of server response
- **401 handling**: Already logged out is not an error—treat as success
- **Redirect method**: Use `window.location.href` for hard redirect (clears all state)
- **Error logging**: Log errors for debugging, but don't block sign-out flow
- **Button placement**: Implementer decides where to place sign-out button (header, profile menu, etc.)

**Common Pitfalls**:
- Blocking sign-out on network error → Always clear state and redirect
- Using React Router navigate() → Use window.location.href for hard redirect
- Not disabling button during loading → Add disabled={loading}
- Showing error to user and blocking redirect → Log error, but proceed with sign-out

---

## Constitutional Compliance

**Principle V (Security)**:
- Session termination on server and client
- Clear all local state
- Redirect to safe public page
- Handle 401 gracefully

**Principle VI (Performance & Reliability)**:
- Graceful error handling
- Prevent duplicate requests
- Fast redirect (no loading spinner blocking)

---

## Handoff to Next Work Package

**Output Artifacts**:
- `src/hooks/useSignOut.ts` - Reusable sign-out hook
- Updated `AuthProvider` with `signOut` in context
- Tests for sign-out flow

**Next WP (WP07)** requires authenticated user to access profile page—sign-out provides exit path.

**Integration Points**:
- WP08 (session verification) will call `signOut()` on 401 responses
- All protected pages should include sign-out button (implementation detail)

---

**Prompt Version**: 1.0
**Last Updated**: 2025-12-08
**Maintainer**: F02 Implementation Team

## Activity Log

- 2025-12-09T07:53:24Z – claude – shell_pid=35160 – lane=doing – Starting WP06 implementation
- 2025-12-09T07:58:18Z – claude – shell_pid=35160 – lane=for_review – WP06 complete
