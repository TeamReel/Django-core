---
lane: "doing"
agent: "claude"
shell_pid: "13484"
---
# WP05: Demo & Integration
*Tasks: T021, T022, T023, T024, T025, T026*

## Context
We need to verify the entire feature works by building a demo page in the `demo-shell`. This serves as both a manual test bed and a reference implementation.

## Requirements
1.  **Demo Page**:
    *   Create `src/pages/files/index.tsx` (or similar) in `examples/demo-shell`.
    *   Route: `/demo/files`.
2.  **Integration**:
    *   Use the `FileUpload` component (WP04).
    *   Connect it to the API (WP02) using the `ApiClient`.
    *   Handle the upload process (POST to `/api/files/`).
3.  **File List**:
    *   Fetch the list of files from `/api/files/`.
    *   Display them in a grid or list.
    *   Show thumbnails if available.
    *   Add a "Download" button (calls `/api/files/{id}/download/`).
    *   Add a "Delete" button (calls DELETE `/api/files/{id}/`).
4.  **Manual Verification**:
    *   Verify the full flow: Upload -> Thumbnail appears (after refresh/poll) -> Download works -> Delete removes it from list.
    *   Document the steps in `DEMO_TEST_GUIDE.md`.
5.  **E2E Testing (Playwright)**:
    *   Create `tests/e2e/files.spec.ts`.
    *   Test case: User can upload a file (mock file input).
    *   Test case: User can see uploaded file in list.
    *   Test case: User can delete file.
    *   Ensure tests run in CI.

## Definition of Done
- `/demo/files` is accessible and functional.
- Can upload, list, download, and delete files via the UI.
- Manual test guide is written.
- Playwright E2E tests pass.

## Activity Log

- 2025-12-18T11:38:34Z – claude – shell_pid=13484 – lane=doing – Started implementation - Demo integration and E2E testing
