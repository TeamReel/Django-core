from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def search_page(request):
    """Render the search demo page."""
    return render(request, "web_ui/search.html")
