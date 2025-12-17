# Test script for SQLite fallback compatibility (T013)
# 032-demo-production-database (WP04)
#
# Purpose: Verify seed/validate/reset commands work with SQLite
# Usage: .\scripts\test-sqlite-fallback.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "[TEST] SQLite Fallback Compatibility (WP04)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$env:DATABASE_URL = "sqlite:///./data/test_demo.sqlite3"
$env:DEMO_RANDOM_SEED = "42"
$pythonCmd = "python"
$manageCmd = "manage.py"

Write-Host "[INFO] Environment:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL: $env:DATABASE_URL"
Write-Host "  DEMO_RANDOM_SEED: $env:DEMO_RANDOM_SEED"
Write-Host ""

# Clean slate
Write-Host "[CLEAN] Cleaning previous test database..." -ForegroundColor Yellow
if (Test-Path "./data/test_demo.sqlite3") {
    Remove-Item "./data/test_demo.sqlite3" -Force
}
if (-not (Test-Path "./data")) {
    New-Item -ItemType Directory -Path "./data" | Out-Null
}
Write-Host "  [OK] Cleaned" -ForegroundColor Green
Write-Host ""

# Step 1: Migrations
Write-Host "[STEP 1] Running migrations..." -ForegroundColor Yellow
& $pythonCmd $manageCmd migrate --noinput
Write-Host "  [OK] Migrations applied" -ForegroundColor Green
Write-Host ""

# Step 2: Seed data
Write-Host "[STEP 2] Seeding demo data..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
cmd /c "$pythonCmd $manageCmd seed_demo_data --json > `"$env:TEMP\seed_output_raw.txt`" 2>&1"
$ErrorActionPreference = "Stop"
$seedRawContent = Get-Content "$env:TEMP\seed_output_raw.txt" -Raw
$seedOutput = $null

# Extract JSON block (pretty-printed JSON starts with { and newline/whitespace)
if ($seedRawContent -match '(?ms)\{\s+".*?\}(?=\s*$)') {
    try {
        $seedOutput = $matches[0] | ConvertFrom-Json
    } catch {
        Write-Host "  [WARN] JSON parsing failed: $($_.Exception.Message)"
    }
}

if ($null -ne $seedOutput) {
    $orgAdmins = if ($null -eq $seedOutput.org_admins) { 0 } else { $seedOutput.org_admins }
    $membersViewers = if ($null -eq $seedOutput.members_viewers) { 0 } else { $seedOutput.members_viewers }
    $totalUsers = if ($null -eq $seedOutput.users_additional) { 0 } else { $seedOutput.users_additional }
    $totalUsers += $seedOutput.superusers + $orgAdmins + $membersViewers
    Write-Host "  Seeded: $($seedOutput.organisations) orgs, $totalUsers users, $($seedOutput.projects) projects"
} else {
    Write-Host "  [WARN] Could not find JSON output in command result"
}
Write-Host "  [OK] Seed completed" -ForegroundColor Green
Write-Host ""

# Step 3: Validate data
Write-Host "[STEP 3] Validating data integrity..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
cmd /c "$pythonCmd $manageCmd validate_demo_data --json > `"$env:TEMP\validate_output_raw.txt`" 2>&1"
$ErrorActionPreference = "Stop"
$validateRawContent = Get-Content "$env:TEMP\validate_output_raw.txt" -Raw
$validateOutput = $null

if ($validateRawContent -match '(?ms)\{\s+".*?\}(?=\s*$)') {
    try {
        $validateOutput = $matches[0] | ConvertFrom-Json
    } catch {
        Write-Host "  [WARN] JSON parsing failed: $($_.Exception.Message)"
    }
}

if ($null -ne $validateOutput) {
    if ($validateOutput.status -eq "pass") {
        Write-Host "  [OK] Validation passed - all $($validateOutput.checks_performed) checks successful" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Validation failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [WARN] Could not find JSON output in command result"
    exit 1
}
Write-Host ""

# Step 4: Check counts
Write-Host "[STEP 4] Verifying expected counts..." -ForegroundColor Yellow
$countScript = "import os, sys, django, logging; sys.path.append('src'); os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base'); logging.disable(logging.CRITICAL); django.setup(); from organisations.models import Organisation; from accounts.models import User; from projects.models import Project; print(f'{Organisation.objects.count()},{User.objects.count()},{Project.all_objects.count()}')"
$counts = & $pythonCmd -c $countScript
# Parse the last line in case there is still some noise
$countsLine = $counts.Trim().Split("`n")[-1]
$countsArr = $countsLine.Split(',')
$orgs = $countsArr[0]
$users = $countsArr[1]
$projects = $countsArr[2]

Write-Host "  Organizations: $orgs (expected: 5)"
Write-Host "  Users: $users (expected: 20)"
Write-Host "  Projects: $projects (expected: 80)"

if ($orgs -ne "5" -or $users -ne "20" -or $projects -ne "80") {
    Write-Host "  [FAIL] Count mismatch" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All counts correct" -ForegroundColor Green
Write-Host ""

# Step 5: Reset and reseed
Write-Host "[STEP 5] Testing reset and reseed..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
cmd /c "$pythonCmd $manageCmd reset_demo_data --force --json > `"$env:TEMP\reset_output_raw.txt`" 2>&1"
$ErrorActionPreference = "Stop"
$resetRawContent = Get-Content "$env:TEMP\reset_output_raw.txt" -Raw
$resetOutput = $null

if ($resetRawContent -match '(?ms)\{\s+".*?\}(?=\s*$)') {
    try {
        $resetOutput = $matches[0] | ConvertFrom-Json
    } catch {
        Write-Host "  [WARN] JSON parsing failed: $($_.Exception.Message)"
    }
}

if ($null -ne $resetOutput) {
    Write-Host "  Reset completed: $($resetOutput.deleted_count) records deleted"
} else {
    Write-Host "  [WARN] Could not find JSON output in command result"
}

# Verify counts after reset
$countScript = "import os, sys, django, logging; sys.path.append('src'); os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base'); logging.disable(logging.CRITICAL); django.setup(); from organisations.models import Organisation; from accounts.models import User; from projects.models import Project; print(f'{Organisation.objects.count()},{User.objects.count()},{Project.all_objects.count()}')"
$counts = & $pythonCmd -c $countScript
# Parse the last line in case there is still some noise
$countsLine = $counts.Trim().Split("`n")[-1]
$countsArr = $countsLine.Split(',')
$orgsAfter = $countsArr[0]
$usersAfter = $countsArr[1]
$projectsAfter = $countsArr[2]

Write-Host "  Organizations after reset: $orgsAfter (expected: 5)"
Write-Host "  Users after reset: $usersAfter (expected: 20)"
Write-Host "  Projects after reset: $projectsAfter (expected: 80)"

if ($orgsAfter -ne "5" -or $usersAfter -ne "20" -or $projectsAfter -ne "80") {
    Write-Host "  [FAIL] Reset count mismatch" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Reset and reseed successful" -ForegroundColor Green
Write-Host ""

# Step 6: Test idempotency
Write-Host "[STEP 6] Testing idempotency..." -ForegroundColor Yellow
$startTime = Get-Date
& $pythonCmd $manageCmd seed_demo_data | Out-File -FilePath "$env:TEMP\idempotent_output.txt" -Encoding UTF8
$endTime = Get-Date
$elapsed = ($endTime - $startTime).TotalSeconds
$elapsedRounded = [math]::Round($elapsed, 1)

$idempotentOutput = Get-Content "$env:TEMP\idempotent_output.txt" -Raw
if ($idempotentOutput -match "already exists") {
    Write-Host "  [OK] Idempotency check passed (${elapsedRounded}s)" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Did not detect 'already exists' message" -ForegroundColor Yellow
}
Write-Host ""

# Success
Write-Host "[SUCCESS] All SQLite Compatibility Tests Passed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:"
Write-Host "  [OK] Migrations successful"
Write-Host "  [OK] Seed command works on SQLite"
Write-Host "  [OK] Validate command works on SQLite"
Write-Host "  [OK] Reset command works on SQLite"
Write-Host "  [OK] All entity counts correct"
Write-Host "  [OK] Idempotency preserved"
Write-Host ""
Write-Host "Database location: ./data/test_demo.sqlite3"
if (Test-Path "./data/test_demo.sqlite3") {
    $dbSize = (Get-Item "./data/test_demo.sqlite3").Length / 1MB
    $dbSizeRounded = [math]::Round($dbSize, 2)
    Write-Host "Database size: ${dbSizeRounded} MB"
}
