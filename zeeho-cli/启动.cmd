@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 极核每日签到

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org/
  echo.
  pause
  exit /b 1
)

node "%~dp0zeeho.js" %*
set "CODE=%ERRORLEVEL%"
if not "%CODE%"=="0" (
  echo.
  pause
)
exit /b %CODE%
