@echo off
rem Lanza detener.ps1 sin depender de la politica de ejecucion de PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0detener.ps1" %*
if errorlevel 1 pause
