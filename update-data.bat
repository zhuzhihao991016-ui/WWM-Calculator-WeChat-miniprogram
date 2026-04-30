@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

set LOG_DIR=%~dp0logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set NOW=%%i
set LOG_FILE=%LOG_DIR%\update-data-%NOW%.log

call :log ==========================================
call :log 开始批量更新数据
call :log 项目目录: %~dp0
call :log 日志文件: %LOG_FILE%
call :log ==========================================

set SCRIPTS[0]=.\scripts\excel-to-json.js
set SCRIPTS[1]=.\scripts\excelToSchools.js
set SCRIPTS[2]=.\scripts\excelToSkills.js
set SCRIPTS[3]=.\scripts\excelToGrandPanel.js
set SCRIPTS[4]=.\scripts\excelToAxes.js
set SCRIPTS[5]=.\scripts\excelToBonuses.js
set SCRIPTS[6]=.\scripts\excelToSets.js
set SCRIPTS[7]=.\scripts\excelToAffixs.js


for /l %%n in (0,1,7) do (
  call :run "!SCRIPTS[%%n]!"
  if errorlevel 1 goto error
)

call :log ==========================================
call :log 所有脚本执行完成
call :log ==========================================
echo.
echo 所有脚本执行完成，日志已保存到：
echo %LOG_FILE%
pause
exit /b 0

:error
call :log ==========================================
call :log 执行失败，请检查上方控制台输出或日志文件
call :log ==========================================
echo.
echo 脚本执行失败，日志已保存到：
echo %LOG_FILE%
pause
exit /b 1

:run
set SCRIPT_PATH=%~1
call :log.
call :log [开始] %SCRIPT_PATH%
echo [开始] %SCRIPT_PATH%

node "%SCRIPT_PATH%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log [失败] %SCRIPT_PATH%
  echo [失败] %SCRIPT_PATH%
  exit /b 1
)

call :log [成功] %SCRIPT_PATH%
echo [成功] %SCRIPT_PATH%
exit /b 0

:log
set MSG=%*
echo %date% %time% %MSG%
>> "%LOG_FILE%" echo %date% %time% %MSG%
exit /b 0