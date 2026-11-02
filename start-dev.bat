@echo off
REM Quick start script for UNUFood development on Windows

echo.
echo ========================================
echo    UNUFood Development Server
echo ========================================
echo.
echo Starting server on http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first, then Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    python -m http.server 8000
) else (
    where python3 >nul 2>nul
    if %errorlevel% equ 0 (
        python3 -m http.server 8000
    ) else (
        echo Python not found. Please install Python first.
        pause
        exit /b 1
    )
)
