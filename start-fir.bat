@echo off
title FIR Management System

echo ==========================================
echo      FIR MANAGEMENT SYSTEM
echo ==========================================
echo.

echo Starting Backend...
start "FIR Backend - Port 5000" cmd /k "cd /d D:\vac\day 2\fir-management-system\backend && node server.js"

timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "FIR Frontend - Port 3000" cmd /k "cd /d D:\vac\day 2\fir-management-system && npx serve . -l 3000"

echo.
echo ==========================================
echo Backend  : http://localhost:5000
echo Frontend : http://localhost:3000
echo ==========================================
echo.
echo Both servers are starting...
pause