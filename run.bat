@echo off
chcp 65001 >nul
title TikTok Live TTS Bot

echo ========================================================
echo   TikTok Live Text-to-Speech (TTS) Bot
echo   Dual-Mode: Cloud Web Platform ^& Local Desktop
echo   Hotkeys: F9 = Emergency Mute ^& Flush Queue
echo ========================================================
echo.

if exist ".venv\Scripts\activate.bat" (
    echo [*] Activating virtual environment [.venv]...
    call .venv\Scripts\activate.bat
) else (
    echo [!] Virtual environment not found. Falling back to system Python...
)

python main.py %*
if errorlevel 1 (
    echo.
    echo [Error] The bot exited with an error.
    pause
)
