@echo off
setlocal EnableDelayedExpansion
title Claude Code CLI

:: ANSI color setup (Windows 10+)
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "CYAN=%ESC%[96m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "RED=%ESC%[91m"
set "MAGENTA=%ESC%[95m"
set "BOLD=%ESC%[1m"
set "DIM=%ESC%[2m"
set "RST=%ESC%[0m"

:MAIN_LOOP
cls
echo.
echo !CYAN!!BOLD!  ========================================================
echo   =                                                      =
echo   =            C L A U D E   C O D E                     =
echo   =                 !MAGENTA!C   L   I!CYAN!                          =
echo   =                                                      =
echo   ========================================================!RST!
echo.
echo   !BOLD!!MAGENTA!-- Skip Permissions --!RST!
echo.
echo     !GREEN!1!RST!  claude --dangerously-skip-permissions
echo     !GREEN!2!RST!  claude --dangerously-skip-permissions -c  !DIM!(continue)!RST!
echo     !GREEN!3!RST!  claude --dangerously-skip-permissions -r  !DIM!(resume)!RST!
echo.
echo   !BOLD!!MAGENTA!-- Permission Mode --!RST!
echo.
echo     !GREEN!4!RST!  claude --permission-mode ^<mode^>
echo     !GREEN!5!RST!  claude --permission-mode ^<mode^> -c       !DIM!(continue)!RST!
echo     !GREEN!6!RST!  claude --permission-mode ^<mode^> -r       !DIM!(resume)!RST!
echo.
echo   !BOLD!!MAGENTA!-- Maintenance --!RST!
echo.
echo     !GREEN!7!RST!  claude mcp list
echo     !GREEN!8!RST!  claude update
echo.
echo     !RED!q!RST!  Quit
echo.

set "CHOICE="
set /p "CHOICE=  Enter choice: "

if "!CHOICE!"=="" goto :MAIN_LOOP
if /i "!CHOICE!"=="q"    goto :BYE
if /i "!CHOICE!"=="quit" goto :BYE
if /i "!CHOICE!"=="exit" goto :BYE

if "!CHOICE!"=="1" goto :C1
if "!CHOICE!"=="2" goto :C2
if "!CHOICE!"=="3" goto :C3
if "!CHOICE!"=="4" goto :C4
if "!CHOICE!"=="5" goto :C5
if "!CHOICE!"=="6" goto :C6
if "!CHOICE!"=="7" goto :C7
if "!CHOICE!"=="8" goto :C8

echo.
echo   !RED!Invalid choice, please try again.!RST!
echo.
pause
goto :MAIN_LOOP

:: --- Simple commands ------------------------------------------------

:C1
set "CMD=claude --dangerously-skip-permissions"
goto :CONFIRM

:C2
set "CMD=claude --dangerously-skip-permissions -c"
goto :CONFIRM

:C3
set "CMD=claude --dangerously-skip-permissions -r"
goto :CONFIRM

:C7
set "CMD=claude mcp list"
goto :CONFIRM

:C8
set "CMD=claude update"
goto :CONFIRM

:: --- Permission mode commands ---------------------------------------

:C4
call :SELECT_MODE
if "!MODE!"=="" goto :MAIN_LOOP
set "CMD=claude --permission-mode !MODE!"
goto :CONFIRM

:C5
call :SELECT_MODE
if "!MODE!"=="" goto :MAIN_LOOP
set "CMD=claude --permission-mode !MODE! -c"
goto :CONFIRM

:C6
call :SELECT_MODE
if "!MODE!"=="" goto :MAIN_LOOP
set "CMD=claude --permission-mode !MODE! -r"
goto :CONFIRM

:: --- Mode selector --------------------------------------------------

:SELECT_MODE
set "MODE="
echo.
echo   !BOLD!Select permission mode:!RST!
echo.
echo     !GREEN!a!RST!  acceptEdits
echo     !GREEN!b!RST!  bypassPermissions
echo     !GREEN!c!RST!  default
echo     !GREEN!d!RST!  dontAsk
echo     !GREEN!e!RST!  plan
echo     !GREEN!f!RST!  auto
echo.
set "MC="
set /p "MC=  Choice [a-f]: "
if /i "!MC!"=="a" set "MODE=acceptEdits"
if /i "!MC!"=="b" set "MODE=bypassPermissions"
if /i "!MC!"=="c" set "MODE=default"
if /i "!MC!"=="d" set "MODE=dontAsk"
if /i "!MC!"=="e" set "MODE=plan"
if /i "!MC!"=="f" set "MODE=auto"
if "!MODE!"=="" (
    echo.
    echo   !RED!Invalid mode, returning to menu.!RST!
    echo.
    pause
)
goto :eof

:: --- Confirm and execute --------------------------------------------

:CONFIRM
echo.
echo   !YELLOW!^> !BOLD!!CMD!!RST!
echo.
set "YN="
set /p "YN=  Execute? [Y/n]: "
if /i "!YN!"=="n" (
    echo.
    echo   !DIM!Cancelled.!RST!
    echo.
    pause
    goto :MAIN_LOOP
)
if /i "!YN!"=="no" (
    echo.
    echo   !DIM!Cancelled.!RST!
    echo.
    pause
    goto :MAIN_LOOP
)
echo.
echo   !DIM!Running...!RST!
echo   !DIM!--------------------------------------------!RST!
echo.
!CMD!
echo.
echo   !DIM!--------------------------------------------!RST!
echo.
pause
goto :MAIN_LOOP

:: --- Exit -----------------------------------------------------------

:BYE
echo.
echo   !DIM!Bye!RST!
echo.
exit /b 0
