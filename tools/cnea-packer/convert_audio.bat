@echo off
setlocal
cd /d "%~dp0"
node pack.mjs "%~1"
if errorlevel 1 exit /b %errorlevel%
