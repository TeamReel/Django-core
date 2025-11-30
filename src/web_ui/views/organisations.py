"""Organisation views for web_ui app."""

from django.contrib.auth.decorators import login_required, permission_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, render
from organisations.models import Organisation


@login_required
@permission_required("organisations.view_organisation", raise_exception=True)
def organisations_list(request: HttpRequest) -> HttpResponse:
    """
    List all organisations where user is a member.

    Stub view: Shows placeholder list using list_table component.
    """
    # Stub: Get organisations where user is member
    organisations = Organisation.objects.filter(members=request.user).select_related()

    context = {
        "page_title": "Organisations",
        "organisations": organisations,
    }
    return render(request, "web_ui/organisations/list.html", context)


@login_required
@permission_required("organisations.view_organisation", raise_exception=True)
def organisations_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """
    Show organisation detail page.

    Stub view: Shows basic info without full functionality.
    """
    # Stub: Get organisation if user is member
    organisation = get_object_or_404(Organisation.objects.filter(members=request.user), pk=pk)

    context = {
        "page_title": f"Organisation: {organisation.name}",
        "organisation": organisation,
    }
    return render(request, "web_ui/organisations/detail.html", context)
