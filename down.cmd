@echo off
setlocal
set "PATH=%LOCALAPPDATA%\.meteor;C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\down.ps1" %*
