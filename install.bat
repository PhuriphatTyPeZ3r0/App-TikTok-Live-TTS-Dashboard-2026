@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

title TikTok Live TTS Bot - 1-Click Installer

echo ========================================================
echo   TikTok Live Text-to-Speech (TTS) Bot Setup Installer
echo ========================================================
echo.

:: 1. Check if Python is installed and accessible in PATH
echo [*] Checking Python installation...
where python >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed or not found in system PATH.
    echo Please install Python 3.10 or higher from:
    echo   https://www.python.org/downloads/
    echo.
    echo Make sure to check the option: "Add python.exe to PATH"
    echo.
    pause
    exit /b 1
)

:: 2. Verify Python version is at least 3.10
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python 3.10 or higher is required.
    echo Please install Python 3.10+ from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python -V 2^>^&1') do echo [+] Detected %%v

:: 3. Setup Virtual Environment (.venv)
if not exist ".venv\Scripts\activate.bat" (
    echo.
    echo [*] Creating virtual environment [.venv]...
    python -m venv .venv
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [+] Virtual environment created successfully.
) else (
    echo [+] Virtual environment [.venv] already exists.
)

:: 4. Activate Virtual Environment
echo [*] Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

:: 5. Upgrade pip
echo.
echo [*] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo [WARNING] Could not upgrade pip. Continuing with dependency installation...
)

:: 6. Install dependencies from requirements.txt
echo.
echo [*] Installing dependencies from requirements.txt...
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ERROR] Dependency installation failed.
    echo Please check your internet connection or Python environment.
    pause
    exit /b 1
)
echo [+] All dependencies installed successfully.

:: 7. Initialize environment configuration (.env)
echo.
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Initializing configuration [.env] from template [.env.example]...
        copy .env.example .env >nul
        echo [+] Created .env configuration file.
        echo [NOTE] Remember to edit .env with your TikTok username before starting!
    ) else (
        echo [WARNING] .env.example not found. Please create a .env configuration file manually.
    )
) else (
    echo [+] Configuration file [.env] already exists.
)

:: 8. Success and Quickstart Banner
echo.
echo ========================================================
echo   Setup Completed Successfully!
echo ========================================================
echo.
echo Quickstart Steps:
echo   1. Edit '.env' file to set your TikTok username:
echo        TIKTOK_USERNAME=@yourchannel
echo   2. Run 'run.bat' to launch the TTS Bot or Cloud Web Platform:
echo        Local Desktop Mode:  run.bat
echo        Cloud Web Platform:  run.bat --web --port 7860
echo.
echo Press any key to exit installer.
pause >nul
