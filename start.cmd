@echo off
setlocal
REM Bootstrap PATH for a fresh Windows terminal (Node + global npm shims + Meteor)
set "PATH=%LOCALAPPDATA%\.meteor;C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*
