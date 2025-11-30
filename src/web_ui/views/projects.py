"""Project views for web_ui app."""

from django.contrib.auth.decorators import login_required, permission_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, render
from projects.models import Project


@login_required
@permission_required("projects.view_project", raise_exception=True)
def projects_list(request: HttpRequest) -> HttpResponse:
    """
    List all projects in user's organisations.

    Stub view: Shows placeholder list using list_table component.
    """
    # Stub: Get projects in user's organisations
    projects = Project.objects.filter(organisation__members=request.user).select_related(
        "organisation", "owner"
    )

    context = {
        "page_title": "Projects",
        "projects": projects,
    }
    return render(request, "web_ui/projects/list.html", context)


@login_required
@permission_required("projects.view_project", raise_exception=True)
def projects_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """
    Show project detail page.

    Stub view: Shows basic info without full functionality.
    """
    # Stub: Get project if user has access via organisation
    project = get_object_or_404(
        Project.objects.filter(organisation__members=request.user).select_related(
            "organisation", "owner"
        ),
        pk=pk,
    )

    context = {
        "page_title": f"Project: {project.name}",
        "project": project,
    }
    return render(request, "web_ui/projects/detail.html", context)
