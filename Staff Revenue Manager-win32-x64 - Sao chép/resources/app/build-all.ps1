# PowerShell script to build Staff Revenue Manager for all Windows architectures
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Staff Revenue Manager for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Clean previous builds
Write-Host "`nCleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Rebuild native modules
Write-Host "`nRebuilding native modules..." -ForegroundColor Yellow
npm run rebuild
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to rebuild native modules" -ForegroundColor Red
    exit 1
}

# Build for different architectures
$architectures = @("x64", "ia32", "arm64")
$success = $true

foreach ($arch in $architectures) {
    Write-Host "`nBuilding for $arch..." -ForegroundColor Yellow
    npm run "build-win-$arch"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed for $arch" -ForegroundColor Red
        $success = $false
    } else {
        Write-Host "SUCCESS: Build completed for $arch" -ForegroundColor Green
    }
}

# Show results
Write-Host "`n========================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`nFiles created in 'dist' folder:" -ForegroundColor Yellow
    if (Test-Path "dist") {
        Get-ChildItem "dist" -Filter "*.exe" | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor White }
        Get-ChildItem "dist" -Filter "*.zip" | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor White }
        Get-ChildItem "dist" -Filter "*.7z" | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor White }
    }
} else {
    Write-Host "Build completed with errors!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
