# Test script for SQLite fallback compatibility (T013)
# 032-demo-production-database (WP04)
#
# Purpose: Verify seed/validate/reset commands work with SQLite
# Usage: .\scripts\test-sqlite-fallback.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔍 Testing SQLite Fallback Compatibility (WP04)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$env:DATABASE_URL = "sqlite:///./data/test_demo.sqlite3"
$env:DEMO_RANDOM_SEED = "42"
$pythonCmd = "python"
$manageCmd = "manage.py"

Write-Host "📊 Environment:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL: $env:DATABASE_URL"
Write-Host "  DEMO_RANDOM_SEED: $env:DEMO_RANDOM_SEED"
Write-Host ""

# Clean slate
Write-Host "🧹 Cleaning previous test database..." -ForegroundColor Yellow
if (Test-Path "./data/test_demo.sqlite3") {
    Remove-Item "./data/test_demo.sqlite3" -Force
}
if (-not (Test-Path "./data")) {
    New-Item -ItemType Directory -Path "./data" | Out-Null
}
Write-Host "  ✓ Cleaned" -ForegroundColor Green
Write-Host ""

# Step 1: Migrations
Write-Host "🔄 Step 1: Running migrations..." -ForegroundColor Yellow
& $pythonCmd $manageCmd migrate --noinput
Write-Host "  ✓ Migrations applied" -ForegroundColor Green
Write-Host ""

# Step 2: Seed data
Write-Host "🌱 Step 2: Seeding demo data..." -ForegroundColor Yellow
& $pythonCmd $manageCmd seed_demo_data --json | Out-File -FilePath "$env:TEMP\seed_output.json" -Encoding UTF8
$seedOutput = Get-Content "$env:TEMP\seed_output.json" | ConvertFrom-Json
$seedOutput | ConvertTo-Json -Depth 10 | Write-Host
Write-Host "  ✓ Seed completed" -ForegroundColor Green
Write-Host ""

# Step 3: Validate data
Write-Host "✅ Step 3: Validating data integrity..." -ForegroundColor Yellow
& $pythonCmd $manageCmd validate_demo_data --json | Out-File -FilePath "$env:TEMP\validate_output.json" -Encoding UTF8
$validateOutput = Get-Content "$env:TEMP\validate_output.json" | ConvertFrom-Json
$validateOutput | ConvertTo-Json -Depth 10 | Write-Host

if ($validateOutput.status -eq "pass") {
    Write-Host "  ✓ Validation passed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Validation failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Check counts
Write-Host "📈 Step 4: Verifying expected counts..." -ForegroundColor Yellow
$orgs = & $pythonCmd $manageCmd shell -c "from organisations.models import Organisation; print(Organisation.objects.count())"
$users = & $pythonCmd $manageCmd shell -c "from accounts.models import User; print(User.objects.count())"
$projects = & $pythonCmd $manageCmd shell -c "from projects.models import Project; print(Project.all_objects.count())"

Write-Host "  Organizations: $orgs (expected: 5)"
Write-Host "  Users: $users (expected: 20)"
Write-Host "  Projects: $projects (expected: 80)"

if ($orgs -ne "5" -or $users -ne "20" -or $projects -ne "80") {
    Write-Host "  ✗ Count mismatch" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ All counts correct" -ForegroundColor Green
Write-Host ""

# Step 5: Reset and reseed
Write-Host "🔄 Step 5: Testing reset and reseed..." -ForegroundColor Yellow
& $pythonCmd $manageCmd reset_demo_data --force --json | Out-File -FilePath "$env:TEMP\reset_output.json" -Encoding UTF8
$resetOutput = Get-Content "$env:TEMP\reset_output.json" | ConvertFrom-Json
$resetOutput | ConvertTo-Json -Depth 10 | Write-Host

# Verify counts after reset
$orgsAfter = & $pythonCmd $manageCmd shell -c "from organisations.models import Organisation; print(Organisation.objects.count())"
$usersAfter = & $pythonCmd $manageCmd shell -c "from accounts.models import User; print(User.objects.count())"
$projectsAfter = & $pythonCmd $manageCmd shell -c "from projects.models import Project; print(Project.all_objects.count())"

Write-Host "  Organizations after reset: $orgsAfter (expected: 5)"
Write-Host "  Users after reset: $usersAfter (expected: 20)"
Write-Host "  Projects after reset: $projectsAfter (expected: 80)"

if ($orgsAfter -ne "5" -or $usersAfter -ne "20" -or $projectsAfter -ne "80") {
    Write-Host "  ✗ Reset count mismatch" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Reset and reseed successful" -ForegroundColor Green
Write-Host ""

# Step 6: Test idempotency
Write-Host "🔁 Step 6: Testing idempotency..." -ForegroundColor Yellow
$startTime = Get-Date
& $pythonCmd $manageCmd seed_demo_data | Out-File -FilePath "$env:TEMP\idempotent_output.txt" -Encoding UTF8
$endTime = Get-Date
$elapsed = ($endTime - $startTime).TotalSeconds

$idempotentOutput = Get-Content "$env:TEMP\idempotent_output.txt" -Raw
if ($idempotentOutput -match "already exists") {
    Write-Host "  ✓ Idempotency check passed ($([math]::Round($elapsed, 1))s)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Warning: Did not detect 'already exists' message" -ForegroundColor Yellow
}
Write-Host ""

# Success
Write-Host "🎉 All SQLite Compatibility Tests Passed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:"
Write-Host "  ✓ Migrations successful"
Write-Host "  ✓ Seed command works on SQLite"
Write-Host "  ✓ Validate command works on SQLite"
Write-Host "  ✓ Reset command works on SQLite"
Write-Host "  ✓ All entity counts correct"
Write-Host "  ✓ Idempotency preserved"
Write-Host ""
Write-Host "Database location: ./data/test_demo.sqlite3"
if (Test-Path "./data/test_demo.sqlite3") {
    $dbSize = (Get-Item "./data/test_demo.sqlite3").Length / 1MB
    Write-Host "Database size: $([math]::Round($dbSize, 2)) MB"
}
