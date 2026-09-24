@echo off
rem ============================================================================
rem  LYGO IMAGE ENGINE - point the LYGO LLM Console at this engine, then start
rem  the console's own public gateway on 127.0.0.1 (loopback, this PC only).
rem
rem  What it touches, in order:
rem    1. finds the console           (%LYGO_CONSOLE_ROOT%, then a saved hint, then common paths)
rem    2. writes <console>\config\local.json   media_root + sd_exe + sd_model
rem       config\local.json outranks config\console.json, so nothing shipped is edited.
rem       An existing local.json is MERGED, never overwritten.
rem    3. says out loud whether the engine and a checkpoint were actually found
rem    4. starts PUBLIC_GATEWAY.bat (the console prints its own URL and its bind)
rem ============================================================================
setlocal EnableExtensions EnableDelayedExpansion
title LYGO Image Engine
set "ROOT=%~dp0"
if not "%ROOT:~-1%"=="\" set "ROOT=%ROOT%\"
cd /d "%ROOT%"

set "ENGINE=%ROOT%tools\sd-cpu\sd-cli.exe"
set "MODELDIR=%ROOT%models\sd"

echo LYGO IMAGE ENGINE
echo   engine dir : %ROOT%
echo.

rem ---- 1. the engine itself -------------------------------------------------
if not exist "%ENGINE%" (
  echo   [stop] no engine at "%ENGINE%"
  echo          Reinstall LYGO_IMAGE_ENGINE_SETUP.exe - that file is the engine.
  pause & exit /b 2
)
for %%F in ("%ENGINE%") do echo   engine     : OK  %%F  %%~zF bytes

rem ---- 2. a checkpoint ------------------------------------------------------
set "MODEL="
if exist "%MODELDIR%" (
  for %%F in ("%MODELDIR%\*.safetensors") do if not defined MODEL set "MODEL=%%~fF"
)
if defined MODEL (
  echo   checkpoint : OK  !MODEL!
) else (
  echo   checkpoint : MISSING - no .safetensors in "%MODELDIR%"
  echo                Run get_model.ps1 once - it resumes, and it is the only step
  echo                that needs the network. Or drop your own checkpoint in that folder.
  echo.
  echo                powershell -ExecutionPolicy Bypass -File "%ROOT%get_model.ps1" -List
  pause & exit /b 3
)

rem ---- 3. find the console --------------------------------------------------
set "CONSOLE="
if defined LYGO_CONSOLE_ROOT if exist "%LYGO_CONSOLE_ROOT%\src\public_gateway.py" set "CONSOLE=%LYGO_CONSOLE_ROOT%"
if not defined CONSOLE if exist "%ROOT%config\console_root.txt" (
  set /p SAVED=<"%ROOT%config\console_root.txt"
  if exist "!SAVED!\src\public_gateway.py" set "CONSOLE=!SAVED!"
)
if not defined CONSOLE (
  for %%D in (C D E F G) do (
    for %%P in ("%%D:\LYGO_LLM_CONSOLE" "%%D:\LYGO_INSTALL_131_FULL" "%%D:\LYGO_LLM_CONSOLE_1.3.1" "%%D:\LYGO_CONSOLE") do (
      if not defined CONSOLE if exist "%%~P\src\public_gateway.py" set "CONSOLE=%%~P"
    )
  )
)
if not defined CONSOLE (
  echo.
  echo   [stop] could not find the LYGO LLM Console on this machine.
  echo          Install it first - it is the thing that serves pictures to the web page:
  echo            https://chatagent.ca/lygo-llm-console.html
  echo          Then either run this again, or set it once and run this again:
  echo            setx LYGO_CONSOLE_ROOT "D:\your\console\folder"
  pause & exit /b 4
)
if not exist "%ROOT%config" mkdir "%ROOT%config" >nul 2>&1
>"%ROOT%config\console_root.txt" echo %CONSOLE%
echo   console    : OK  %CONSOLE%

rem ---- 4. hand the console the paths (merge, do not clobber) ----------------
echo   config     : writing %CONSOLE%\config\local.json
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = '%CONSOLE%\config\local.json'; $o = [ordered]@{}; if (Test-Path $p) { try { $j = Get-Content $p -Raw | ConvertFrom-Json; foreach ($n in $j.PSObject.Properties) { $o[$n.Name] = $n.Value } } catch { Write-Host '  [warn] existing local.json did not parse; leaving it alone'; exit 1 } }; $o['media_root'] = '%ROOT:~0,-1%'.Replace('\','/'); $o['sd_exe'] = ('%ENGINE%'.Replace('\','/')); $o['sd_model'] = ('!MODEL!'.Replace('\','/')); $text = $o | ConvertTo-Json -Depth 6; [System.IO.File]::WriteAllText($p, $text, (New-Object System.Text.UTF8Encoding($false))); Write-Host ('  keys now: ' + ($o.Keys -join ', '))"
if errorlevel 1 (
  echo   [note] could not write local.json automatically. Add these three lines to
  echo          %CONSOLE%\config\local.json yourself:
  echo            "media_root": "%ROOT:~0,-1%"
  echo            "sd_exe": "%ENGINE%"
  echo            "sd_model": "!MODEL!"
)

rem ---- 5. start the gateway -------------------------------------------------
echo.
echo   starting the console's public gateway (loopback unless you change gateway_bind)...
echo   when it prints its port, open this on the web portal:
echo       https://chatagent.ca/portal/?console=http://127.0.0.1:9642
echo   (9642 is the gateway's own default port.)
echo.
start "" "%CONSOLE%\PUBLIC_GATEWAY.bat"
echo   gateway launched in its own window. This window can close.
ping -n 9 127.0.0.1 >nul
endlocal
