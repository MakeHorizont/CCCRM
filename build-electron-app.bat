@echo off
echo Building the application...
call npm run electron:build > electron_build.log 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: An error occurred while building the application.
    echo Check the 'electron_build.log' file for details.
    echo.
    pause
    exit /b %errorlevel%
)
echo.
echo Application built successfully.
pause
