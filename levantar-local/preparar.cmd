@echo off
rem Lanza preparar.ps1 sin depender de la politica de ejecucion de PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preparar.ps1" %*
if errorlevel 1 pause
