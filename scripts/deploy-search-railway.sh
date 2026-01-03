#!/usr/bin/env bash
# Railway Search Deployment Script
# This script automates the deployment of search functionality to Railway

set -e  # Exit on error

echo "🚀 Deploying Search Functionality to Railway..."
echo ""

# Step 1: Run migrations
echo "📊 Step 1/3: Running database migrations..."
railway run python manage.py migrate --noinput
echo "✅ Migrations completed"
echo ""

# Step 2: Rebuild search index
echo "🔍 Step 2/3: Building search index..."
railway run python manage.py rebuild_search_index
echo "✅ Search index built"
echo ""

# Step 3: Verify deployment
echo "🧪 Step 3/3: Verifying search functionality..."

# Check if search entries were created
ENTRY_COUNT=$(railway run python manage.py shell -c "from search.models import SearchEntry; print(SearchEntry.objects.count())")

if [ "$ENTRY_COUNT" -gt 0 ]; then
    echo "✅ Search index populated: $ENTRY_COUNT entries"
else
    echo "⚠️  Warning: No search entries found. You may need to seed demo data first."
    echo "   Run: railway run python manage.py seed_football_data"
fi

echo ""
echo "🎉 Search deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Visit: https://your-app.up.railway.app/search/"
echo "   2. Test search with query: 'Premier League'"
echo "   3. Verify API: curl https://your-app.up.railway.app/api/v1/search/?q=premier"
echo ""
echo "📚 Full documentation: docs/railway/SEARCH_DEPLOYMENT.md"
