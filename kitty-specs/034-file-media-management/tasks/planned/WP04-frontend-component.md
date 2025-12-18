# WP04: Frontend Component
*Tasks: T016, T017, T018, T019, T020*

## Context
We need a reusable React component for file uploads in `@django-core/design-system`. This component should handle the UI states (drag-over, uploading, success, error) and provide a clean API for consumers.

## Requirements
1.  **Component Structure**:
    *   `FileUpload` component.
    *   Props: `onUpload` (callback), `accept` (file types), `maxSize`, `multiple`.
2.  **UI/UX**:
    *   **Drop Zone**: Visual change when dragging files over.
    *   **File Selection**: Click to browse.
    *   **Progress**: Show a progress bar during upload (simulated or real if using XHR/Axios onUploadProgress).
    *   **Preview**: Show file name/size and thumbnail (if image) before/after upload.
3.  **Implementation**:
    *   Use `react-dropzone` (if available/allowed) or native HTML5 Drag & Drop API.
    *   Use Design System tokens for styling (colors, spacing).
4.  **Storybook**:
    *   Create stories for: `Default`, `DragOver`, `Uploading` (progress), `Error` (size/type limit), `Success`.
5.  **Tests**:
    *   Vitest + React Testing Library.
    *   Test file selection and drag events.

## Definition of Done
- `FileUpload` component exists in the design system.
- Storybook shows all states correctly.
- Component handles file selection and emits events.
- Tests pass.
