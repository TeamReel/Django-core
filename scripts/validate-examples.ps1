#!/usr/bin/env pwsh
<#
.SYNOPSIS
Validates example code by running TypeScript type-check, lint, and build.

.DESCRIPTION
This script validates the @django-core/integration-guides-examples package
by running TypeScript type checking, ESLint, and the build process. All checks
must pass for the script to succeed.

.OUTPUTS
Exits with code 0 if all validations pass, 1 if any check fails.

.NOTES
Requires pnpm to be installed and available on PATH.
#>

[CmdletBinding()]
param()

Write-Host "🔍 Validating @django-core/integration-guides-examples" -ForegroundColor Cyan
Write-Host ""

# Track success/failure
$failed = $false

# Step 1: Type-check
Write-Host "1️⃣  Running TypeScript type-check..." -ForegroundColor Yellow
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
pnpm --filter @django-core/integration-guides-examples type-check 2>&1 | Tee-Object -Variable typeCheckOutput | Out-Host
$typeCheckSuccess = $LASTEXITCODE -eq 0
$typeCheckTime = $stopwatch.Elapsed.TotalSeconds
$stopwatch.Stop()

if ($typeCheckSuccess) {
    Write-Host "✅ Type-check passed ($([Math]::Round($typeCheckTime, 2))s)" -ForegroundColor Green
}
else {
    Write-Host "❌ Type-check failed" -ForegroundColor Red
    $failed = $true
}
Write-Host ""

# Step 2: Lint
Write-Host "2️⃣  Running ESLint..." -ForegroundColor Yellow
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
pnpm --filter @django-core/integration-guides-examples lint 2>&1 | Tee-Object -Variable lintOutput | Out-Host
$lintSuccess = $LASTEXITCODE -eq 0
$lintTime = $stopwatch.Elapsed.TotalSeconds
$stopwatch.Stop()

if ($lintSuccess) {
    Write-Host "✅ Lint passed ($([Math]::Round($lintTime, 2))s)" -ForegroundColor Green
}
else {
    Write-Host "❌ Lint failed" -ForegroundColor Red
    $failed = $true
}
Write-Host ""

# Step 3: Build
Write-Host "3️⃣  Running build..." -ForegroundColor Yellow
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
pnpm --filter @django-core/integration-guides-examples build 2>&1 | Tee-Object -Variable buildOutput | Out-Host
$buildSuccess = $LASTEXITCODE -eq 0
$buildTime = $stopwatch.Elapsed.TotalSeconds
$stopwatch.Stop()

if ($buildSuccess) {
    Write-Host "✅ Build passed ($([Math]::Round($buildTime, 2))s)" -ForegroundColor Green
}
else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    $failed = $true
}
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($failed) {
    $totalTime = $typeCheckTime + $lintTime + $buildTime
    Write-Host "❌ Validation FAILED (${totalTime}s total)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "• Type errors? Check docs/integration-guides/troubleshooting.md" -ForegroundColor Gray
    Write-Host "• Lint errors? Run: pnpm --filter @django-core/integration-guides-examples lint --fix" -ForegroundColor Gray
    Write-Host "• Build errors? Check dist/ or build output above" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
else {
    $totalTime = $typeCheckTime + $lintTime + $buildTime
    Write-Host "✅ All validations PASSED ($([Math]::Round($totalTime, 2))s total)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to commit! Examples are valid and ready for PR." -ForegroundColor Green
    exit 0
}
