# Quick Setup Script - F01 Frontend Design System
# Run this after cloning on a new laptop

Write-Host "🚀 F01 Frontend Design System - Quick Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right location
$currentPath = Get-Location
if ($currentPath.Path -notlike "*022-frontend-design-system*") {
    Write-Host "⚠️  WARNING: You don't seem to be in the worktree directory" -ForegroundColor Yellow
    Write-Host "Expected path containing: 022-frontend-design-system" -ForegroundColor Yellow
    Write-Host "Current path: $currentPath" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

Write-Host "✓ Location check passed" -ForegroundColor Green
Write-Host ""

# Check Node.js
Write-Host "📦 Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Node.js with one of these methods:" -ForegroundColor Yellow
    Write-Host "  1. winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host "  2. Download from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing, restart your terminal and run this script again." -ForegroundColor Yellow
    exit
}

# Check npm
Write-Host "📦 Checking npm..." -ForegroundColor Cyan
try {
    $npmVersion = npm --version 2>&1
    Write-Host "✓ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found (should come with Node.js)!" -ForegroundColor Red
    exit
}

Write-Host ""

# Check pnpm
Write-Host "📦 Checking pnpm..." -ForegroundColor Cyan
try {
    $pnpmVersion = pnpm --version 2>&1
    Write-Host "✓ pnpm installed: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  pnpm not found - installing..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = pnpm --version 2>&1
    Write-Host "✓ pnpm installed: $pnpmVersion" -ForegroundColor Green
}

Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Write-Host "This may take a few minutes on first run..." -ForegroundColor Gray
Write-Host ""

pnpm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Write-Host "Try running: pnpm install --force" -ForegroundColor Yellow
    exit
}

Write-Host ""

# Run verification
Write-Host "🔍 Running verification checks..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  TypeScript check..." -ForegroundColor Cyan
pnpm --filter design-system typecheck
$typecheckResult = $LASTEXITCODE

Write-Host ""
Write-Host "2️⃣  Linting..." -ForegroundColor Cyan
pnpm --filter design-system lint
$lintResult = $LASTEXITCODE

Write-Host ""
Write-Host "3️⃣  Tests..." -ForegroundColor Cyan
pnpm --filter design-system test --passWithNoTests
$testResult = $LASTEXITCODE

Write-Host ""
Write-Host "4️⃣  Build..." -ForegroundColor Cyan
pnpm --filter design-system build
$buildResult = $LASTEXITCODE

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "📊 Verification Results" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

if ($typecheckResult -eq 0) {
    Write-Host "✅ TypeScript: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript: FAIL" -ForegroundColor Red
}

if ($lintResult -eq 0) {
    Write-Host "✅ Linting: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ Linting: FAIL" -ForegroundColor Red
}

if ($testResult -eq 0) {
    Write-Host "✅ Tests: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ Tests: FAIL" -ForegroundColor Red
}

if ($buildResult -eq 0) {
    Write-Host "✅ Build: PASS" -ForegroundColor Green
} else {
    Write-Host "❌ Build: FAIL" -ForegroundColor Red
}

Write-Host ""

if ($typecheckResult -eq 0 -and $lintResult -eq 0 -and $testResult -eq 0 -and $buildResult -eq 0) {
    Write-Host "🎉 All checks passed! You're ready to continue development." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Read SETUP.md for detailed instructions" -ForegroundColor White
    Write-Host "  2. Start implementing WP02 (Design Token System)" -ForegroundColor White
    Write-Host "  3. Or run: pnpm --filter design-system storybook" -ForegroundColor White
} else {
    Write-Host "⚠️  Some checks failed. Review the errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Cyan
    Write-Host "  - Clear cache: pnpm store prune" -ForegroundColor White
    Write-Host "  - Reinstall: pnpm install --force" -ForegroundColor White
    Write-Host "  - Check SETUP.md troubleshooting section" -ForegroundColor White
}

Write-Host ""
