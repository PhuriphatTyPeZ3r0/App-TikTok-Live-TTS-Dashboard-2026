@echo off
chcp 65001 >nul
title TikTok Live TTS Bot (@fb.jachamch)
echo ========================================================
echo   TikTok Live Text-to-Speech (TTS) Bot (Zero-Cost)
echo   Channel: @fb.jachamch
echo   Voice: Fish Audio (ID: 9c110ffde8bc42709516395dfbcfb4a2)
echo   Hotkeys: F9 = Emergency Mute ^& Flush Queue
echo ========================================================
echo.
python main.py
if errorlevel 1 (
    echo.
    echo [Error] The bot exited with an error.
    pause
)
