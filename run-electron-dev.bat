@echo off
echo Starting the application in development mode...
call npm run electron:dev > electron_dev.log 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: An error occurred while starting the application.
    echo Check the 'electron_dev.log' file for details.
    echo.
    pause
    exit /b %errorlevel%
)
pause
