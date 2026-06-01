@echo off
REM Collections for Spotify - Windows double-click installer.
REM Runs install.ps1 with execution policy bypassed for this process only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
