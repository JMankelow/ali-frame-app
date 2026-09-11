@echo off
REM Hardcode the real (long) path rather than relying on %~dp0, which can
REM resolve to a short 8.3 path if this .bat is invoked via one (as the
REM Claude Code launch.json config does) - Next.js/Turbopack's file watcher
REM crashes on Windows if its watch root is a short-path form.
cd /d "C:\Users\Jo Mankelow - New\OneDrive - BLB Consultants Ltd\Ali Frame Job Management System - Documents\ali-frame-app"
call npx next dev -p 3050
