@echo off
echo ========================================
echo Building Staff Revenue Manager for Windows
echo ========================================

echo.
echo Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "build" rmdir /s /q "build"

echo.
echo Installing dependencies...
call npm install

echo.
echo Rebuilding native modules...
call npm run rebuild

echo.
echo Building for x64 (64-bit)...
call npm run build-win-x64
if %errorlevel% neq 0 (
    echo ERROR: Build failed for x64
    pause
    exit /b 1
)

echo.
echo Building for ia32 (32-bit)...
call npm run build-win-ia32
if %errorlevel% neq 0 (
    echo ERROR: Build failed for ia32
    pause
    exit /b 1
)

echo.
echo Building for arm64 (ARM64)...
call npm run build-win-arm64
if %errorlevel% neq 0 (
    echo ERROR: Build failed for arm64
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Files created in 'dist' folder:
dir /b dist\*.exe
dir /b dist\*.zip
dir /b dist\*.7z

echo.
echo Press any key to exit...
pause >nul
