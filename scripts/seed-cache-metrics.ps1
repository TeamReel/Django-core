# Trigger Cache Metrics Seeding on Railway Production
#
# This script triggers the cache metrics seeder via the API endpoint.
# Requires: Superadmin authentication (session cookie)
#
# Usage: After Railway deployment completes, run this from PowerShell

$apiUrl = "https://api.teamreel.app/api/v1/system/seed-cache-metrics/"

Write-Host "🌱 Triggering cache metrics seeder on Railway..." -ForegroundColor Green
Write-Host ""

# Make the POST request
# Note: You need to be logged in as superadmin in your browser first,
# or pass authentication via -Headers @{"Authorization" = "Bearer YOUR_TOKEN"}

try {
    $response = Invoke-WebRequest -Uri $apiUrl -Method POST -UseDefaultCredentials -UseBasicParsing

    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Seeding completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Cyan
        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
    else {
        Write-Host "⚠️  Unexpected status code: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host $response.Content
    }
}
catch {
    Write-Host "❌ Request failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "💡 Make sure you're logged in as superadmin at https://demo.teamreel.app" -ForegroundColor Yellow
    Write-Host "   Then try running this command with your session cookie:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host '   $cookie = "sessionid=YOUR_SESSION_ID"' -ForegroundColor Gray
    Write-Host '   Invoke-WebRequest -Uri $apiUrl -Method POST -Headers @{"Cookie" = $cookie}' -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next step: Verify the cache performance page" -ForegroundColor Cyan
Write-Host "  👉 https://demo.teamreel.app/demo/performance" -ForegroundColor Cyan
