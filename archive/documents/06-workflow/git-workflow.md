# Git Workflow

## Branching Strategy

We use a simplified feature-branch workflow:

*   **`main`**: The stable production-ready branch.
*   **`feature/Bxx-name`**: Feature branches for specific modules.
*   **`fix/issue-name`**: Bug fix branches.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

*   `feat(B01): add project model`
*   `fix(auth): resolve login timeout`
*   `docs(readme): update installation steps`
*   `chore(deps): upgrade django`

## Pull Requests

*   **Title**: Matches the commit convention.
*   **Description**: References the Spec-Kitty Feature ID.
*   **Checks**: All CI checks must pass before merge.
*   **Review**: Must be approved by Spec-Kitty (`/spec-kitty.review`) or a peer.
