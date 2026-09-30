@echo off
title FinTech Pay Web Server
cd /d "%~dp0"
echo FinTech Pay Web Serveri ishga tushirilmoqda...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
