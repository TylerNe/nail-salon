@echo off
echo ========================================
echo    Staff Revenue Manager - Build Script
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Testing app...
call npm start
if %errorlevel% neq 0 (
    echo ERROR: App failed to start
    pause
    exit /b 1
)

echo.
echo [3/4] Building for Windows...
call npm run build-win
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [4/4] Build completed successfully!
echo.
echo Files created in dist/ folder:
dir /b dist\*.exe
echo.
echo You can now distribute these files:
echo - Staff Revenue Manager Setup 1.0.0.exe (Installer)
echo - Staff Revenue Manager-1.0.0-portable.exe (Portable)
echo.
pause
