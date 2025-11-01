@echo off
echo Installing dependencies...
call npm install > npm_install.log 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: An error occurred during 'npm install'.
    echo Check the 'npm_install.log' file for details.
    echo.
    pause
    exit /b %errorlevel%
)
echo.
echo Dependencies installed successfully.
pause
