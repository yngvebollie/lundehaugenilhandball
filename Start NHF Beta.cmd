@echo off
setlocal
cd /d "%~dp0" || exit /b 1
set "NODE=node"
where node >nul 2>&1
if errorlevel 1 set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%NODE%" --version >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 or open this project in Codex first.
  pause
  exit /b 1
)
if not exist "node_modules\next\dist\bin\next" (
  echo Install the project dependencies with pnpm install --frozen-lockfile first.
  pause
  exit /b 1
)
if not exist ".next\BUILD_ID" (
  "%NODE%" node_modules\next\dist\bin\next build
  if errorlevel 1 goto failed
)
echo Open http://127.0.0.1:3217/ and keep this window open while testing.
"%NODE%" node_modules\next\dist\bin\next start -H 127.0.0.1 -p 3217
if not errorlevel 1 exit /b 0
:failed
echo The beta could not start. Check the error above.
pause
exit /b 1
