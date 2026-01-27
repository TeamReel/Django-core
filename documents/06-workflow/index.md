# Development Workflow

## Overview

This section outlines the processes for building, testing, and contributing to the Core-App. We follow a strict **Spec-Driven Development (SDD)** methodology facilitated by "Spec-Kitty".

## Key Workflows

*   **[Development Setup](development-setup.md)**: Local environment setup, prerequisites, and quickstart guide.
*   **[Extending Core](extending-core.md)**: Guide for building downstream products on top of Core-App foundation.
*   **[Spec-Kitty Workflow](spec-kitty.md)**: The core lifecycle for building features (Specify -> Plan -> Implement).
*   **[Git Workflow](git-workflow.md)**: Branching strategy, commit conventions, and merging.
*   **[Testing Strategy](testing.md)**: How to run and write tests (Unit, Integration, E2E).
*   **[CI/CD Pipeline](cicd.md)**: Automated checks and deployment triggers.
*   **[Railway Setup](railway-setup.md)**: Production deployment configuration and remote commands.
*   **[Railway Staging Setup](railway-staging-setup.md)**: Staging environment for safe full test runs.

## Quick Start

1.  **[Set up your environment](development-setup.md)**: Follow the setup guide for your OS.
2.  **Pick a Module**: Check the [Roadmap](../02-roadmap/index.md).
3.  **Start a Spec**: Run `/spec-kitty.specify feature=Bxx-name`.
4.  **Follow the Steps**: Plan -> Tasks -> Implement -> Review.
5.  **Test**: Run tests following the [Testing Strategy](testing.md).
6.  **Commit**: Follow [Git Workflow](git-workflow.md) conventions.
