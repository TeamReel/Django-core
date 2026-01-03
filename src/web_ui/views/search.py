from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required
def search_page(request):
    """Render the search demo page."""
    return render(request, "web_ui/search.html")
