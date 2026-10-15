# Keeps the booth process up. Starts OBS only when the process is gone.
# It does not press Start Streaming.
$ErrorActionPreference = "Continue"
$root = "C:\LYGO_SERVER\arena-chat"
$node = "C:\Program Files\nodejs\node.exe"
$log = Join-Path $root "watch.log"
function note($m) { Add-Content -Path $log -Value ((Get-Date).ToString("s") + " " + $m) }
$up = Get-NetTCPConnection -LocalPort 8791 -State Listen -ErrorAction SilentlyContinue
if (-not $up) {
  note "starting booth"
  Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = "`"$node`" `"$root\bot.js`""
    CurrentDirectory = $root
  } | Out-Null
}
$obs = Get-Process obs64 -ErrorAction SilentlyContinue
if (-not $obs) {
  $exe = "C:\Program Files (x86)\Steam\steamapps\common\OBS Studio\bin\64bit\obs64.exe"
  if (Test-Path $exe) {
    note "starting OBS"
    Start-Process -FilePath $exe -ArgumentList "--disable-updater","--minimize-to-tray","--disable-shutdown-check"
  } else { note "OBS exe missing" }
}
