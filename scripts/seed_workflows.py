#!/usr/bin/env python
"""
Seed script for workflow engine - creates example workflow templates.

This script is idempotent and can be run multiple times safely.
Use update_or_create to prevent duplicates.

Usage (from project root):
    python scripts/seed_workflows.py
"""
import os
import sys
import django

# Setup Django environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.config.settings")
django.setup()

from src.workflows.models import WorkflowTemplate  # noqa: E402


def seed_content_approval_workflow():
    """Create a content approval workflow template."""
    template, created = WorkflowTemplate.objects.update_or_create(
        name="Content Approval",
        defaults={
            "version": "1.0.0",
            "description": "Standard 3-stage content approval workflow for articles, videos, and other content",
            "is_active": True,
            "definition": {
                "states": [
                    {
                        "name": "draft",
                        "label": "Draft",
                        "is_initial": True,
                        "is_terminal": False,
                        "description": "Content is being created or edited",
                    },
                    {
                        "name": "submitted",
                        "label": "Submitted for Review",
                        "is_initial": False,
                        "is_terminal": False,
                        "description": "Content is awaiting review by editors",
                    },
                    {
                        "name": "approved",
                        "label": "Approved",
                        "is_initial": False,
                        "is_terminal": True,
                        "description": "Content has been approved and published",
                    },
                    {
                        "name": "rejected",
                        "label": "Rejected",
                        "is_initial": False,
                        "is_terminal": True,
                        "description": "Content was rejected and cannot proceed",
                    },
                ],
                "transitions": [
                    {
                        "action": "submit",
                        "label": "Submit for Review",
                        "from_state": "draft",
                        "to_state": "submitted",
                        "permissions": ["can_submit"],
                        "sync_hooks": [],
                        "async_hooks": ["on_enter:submitted"],
                    },
                    {
                        "action": "approve",
                        "label": "Approve Content",
                        "from_state": "submitted",
                        "to_state": "approved",
                        "permissions": ["can_approve"],
                        "sync_hooks": [],
                        "async_hooks": ["on_enter:approved"],
                    },
                    {
                        "action": "reject",
                        "label": "Reject Content",
                        "from_state": "submitted",
                        "to_state": "rejected",
                        "permissions": ["can_approve"],
                        "sync_hooks": [],
                        "async_hooks": ["on_enter:rejected"],
                    },
                    {
                        "action": "revise",
                        "label": "Send Back for Revision",
                        "from_state": "submitted",
                        "to_state": "draft",
                        "permissions": ["can_approve"],
                        "sync_hooks": [],
                        "async_hooks": [],
                    },
                ],
            },
        },
    )
    action = "Created" if created else "Updated"
    print(f"✓ {action} workflow: {template.name} v{template.version}")
    return template


def seed_ticket_workflow():
    """Create a support ticket workflow template."""
    template, created = WorkflowTemplate.objects.update_or_create(
        name="Support Ticket",
        defaults={
            "version": "1.0.0",
            "description": "Support ticket lifecycle from creation to resolution",
            "is_active": True,
            "definition": {
                "states": [
                    {
                        "name": "open",
                        "label": "Open",
                        "is_initial": True,
                        "is_terminal": False,
                        "description": "Ticket is open and awaiting triage",
                    },
                    {
                        "name": "in_progress",
                        "label": "In Progress",
                        "is_initial": False,
                        "is_terminal": False,
                        "description": "Ticket is being worked on",
                    },
                    {
                        "name": "resolved",
                        "label": "Resolved",
                        "is_initial": False,
                        "is_terminal": True,
                        "description": "Ticket has been resolved",
                    },
                    {
                        "name": "closed",
                        "label": "Closed",
                        "is_initial": False,
                        "is_terminal": True,
                        "description": "Ticket is closed without resolution",
                    },
                ],
                "transitions": [
                    {
                        "action": "assign",
                        "label": "Assign to Agent",
                        "from_state": "open",
                        "to_state": "in_progress",
                        "permissions": ["can_assign"],
                        "sync_hooks": [],
                        "async_hooks": ["on_enter:in_progress"],
                    },
                    {
                        "action": "resolve",
                        "label": "Mark as Resolved",
                        "from_state": "in_progress",
                        "to_state": "resolved",
                        "permissions": ["can_resolve"],
                        "sync_hooks": [],
                        "async_hooks": ["on_enter:resolved"],
                    },
                    {
                        "action": "close",
                        "label": "Close Ticket",
                        "from_state": "open",
                        "to_state": "closed",
                        "permissions": ["can_close"],
                        "sync_hooks": [],
                        "async_hooks": [],
                    },
                    {
                        "action": "reopen",
                        "label": "Reopen Ticket",
                        "from_state": "closed",
                        "to_state": "open",
                        "permissions": ["can_reopen"],
                        "sync_hooks": [],
                        "async_hooks": [],
                    },
                ],
            },
        },
    )
    action = "Created" if created else "Updated"
    print(f"✓ {action} workflow: {template.name} v{template.version}")
    return template


def seed_invoice_workflow():
    """Create an invoice approval workflow template."""
    template, created = WorkflowTemplate.objects.update_or_create(
        name="Invoice Approval",
        defaults={
            "version": "1.0.0",
            "description": "Financial approval workflow for invoices and expenses",
            "is_active": True,
            "definition": {
                "states": [
                    {
                        "name": "pending",
                        "label": "Pending Review",
                        "is_initial": True,
                        "is_terminal": False,
                        "description": "Invoice is awaiting initial review",
                    },
                    {
                        "name": "approved",
                        "label": "Approved",
                        "is_initial": False,
                        "is_terminal": True,
                        "description": "Invoice approved for payment",
                    },
                    {
                        "name": "rejected",
                        "label": "Rejected",
                        "is_initial": False,
                        "is_terminal": True,
                        "description": "Invoice rejected, no payment",
                    },
                ],
                "transitions": [
                    {
                        "action": "approve",
                        "label": "Approve Invoice",
                        "from_state": "pending",
                        "to_state": "approved",
                        "permissions": ["can_approve_invoice"],
                        "sync_hooks": [],
                        "async_hooks": ["on_enter:approved"],
                    },
                    {
                        "action": "reject",
                        "label": "Reject Invoice",
                        "from_state": "pending",
                        "to_state": "rejected",
                        "permissions": ["can_approve_invoice"],
                        "sync_hooks": [],
                        "async_hooks": ["on_enter:rejected"],
                    },
                ],
            },
        },
    )
    action = "Created" if created else "Updated"
    print(f"✓ {action} workflow: {template.name} v{template.version}")
    return template


def main():
    """Main seed function."""
    print("=" * 60)
    print("Seeding Workflow Templates...")
    print("=" * 60)

    try:
        seed_content_approval_workflow()
        seed_ticket_workflow()
        seed_invoice_workflow()

        print("=" * 60)
        print(f"✓ Seed complete! Total templates: {WorkflowTemplate.objects.count()}")
        print("=" * 60)
    except Exception as e:
        print(f"✗ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
