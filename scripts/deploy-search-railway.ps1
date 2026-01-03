# Railway Search Deployment Script (PowerShell)
# This script automates the deployment of search functionality to Railway

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Search Functionality to Railway..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Run migrations
Write-Host "📊 Step 1/3: Running database migrations..." -ForegroundColor Yellow
railway run python manage.py migrate --noinput
Write-Host "✅ Migrations completed" -ForegroundColor Green
Write-Host ""

# Step 2: Rebuild search index
Write-Host "🔍 Step 2/3: Building search index..." -ForegroundColor Yellow
railway run python manage.py rebuild_search_index
Write-Host "✅ Search index built" -ForegroundColor Green
Write-Host ""

# Step 3: Verify deployment
Write-Host "🧪 Step 3/3: Verifying search functionality..." -ForegroundColor Yellow

# Check if search entries were created
$entryCount = railway run python manage.py shell -c "from search.models import SearchEntry; print(SearchEntry.objects.count())"

if ([int]$entryCount -gt 0) {
    Write-Host "✅ Search index populated: $entryCount entries" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: No search entries found. You may need to seed demo data first." -ForegroundColor Yellow
    Write-Host "   Run: railway run python manage.py seed_football_data" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Search deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Visit: https://your-app.up.railway.app/search/"
Write-Host "   2. Test search with query: 'Premier League'"
Write-Host "   3. Verify API: curl https://your-app.up.railway.app/api/v1/search/?q=premier"
Write-Host ""
Write-Host "📚 Full documentation: docs/railway/SEARCH_DEPLOYMENT.md" -ForegroundColor Cyan
