; LYGO Image Engine — the picture engine for the LYGO LLM Console, packaged for a public machine.
;
; It installs stable-diffusion.cpp (the CPU build: sd-cli.exe + its DLLs, ~44 MB) and the helper
; scripts, then hands the console the path to it. The CHECKPOINT is not in here on purpose - it is
; 4-7 GB and it belongs to its author, so get_model.ps1 fetches it from Hugging Face, resumable,
; and it is the one step that needs the network.
;
; Build (from the repo root, on a machine that has the engine already):
;   "C:\Users\<you>\AppData\Local\Programs\Inno Setup 6\ISCC.exe" portal\image-engine\installer\lygo_image_engine.iss
; Output: D:\LYGO_IMAGE_ENGINE_SETUP.exe
;
; Per-user install (no admin prompt), no PATH change, no service, no firewall rule.

#define AppName "LYGO Image Engine"
#define AppVersion "1.0.0"
#define EngineSrc "D:\LYGO_MEDIA\tools\sd-cpu"

[Setup]
AppId={{8E1C4B72-9A64-4E7B-9E4C-2C7A2D5B7F31}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=chatagent.ca / DeepSeekOracle
AppPublisherURL=https://chatagent.ca/portal/image-engine.html
AppSupportURL=https://chatagent.ca/portal/
DefaultDirName={localappdata}\LYGO\image-engine
DisableProgramGroupPage=yes
DisableDirPage=no
PrivilegesRequired=lowest
OutputDir=D:\
OutputBaseFilename=LYGO_IMAGE_ENGINE_SETUP
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
LicenseFile=LICENSE_NOTES.txt
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName={#AppName} (stable-diffusion.cpp CPU)

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "gateway"; Description: "Add a desktop shortcut that starts the console's public gateway (loopback only)"; GroupDescription: "Shortcuts:"

[Files]
; The engine itself: the CPU build of stable-diffusion.cpp. Found by the console at
; <media_root>\tools\sd-cpu\sd-cli.exe, which is exactly where this puts it.
Source: "{#EngineSrc}\*"; DestDir: "{app}\tools\sd-cpu"; Flags: ignoreversion recursesubdirs
; The helper scripts.
Source: "get_model.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "LYGO_IMAGE_ENGINE.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "LICENSE_NOTES.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userdesktop}\LYGO Image Engine - start gateway"; Filename: "{app}\LYGO_IMAGE_ENGINE.bat"; Tasks: gateway
Name: "{userprograms}\LYGO Image Engine\Fetch the image model"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\get_model.ps1"""; WorkingDir: "{app}"
Name: "{userprograms}\LYGO Image Engine\Start the gateway"; Filename: "{app}\LYGO_IMAGE_ENGINE.bat"; WorkingDir: "{app}"
Name: "{userprograms}\LYGO Image Engine\README"; Filename: "{app}\README.txt"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\get_model.ps1"" -List"; Description: "Show which checkpoints you can fetch (no download yet)"; Flags: postinstall nowait skipifsilent unchecked
Filename: "{app}\README.txt"; Description: "Read the four steps"; Flags: postinstall shellexec skipifsilent unchecked

[UninstallDelete]
; Pictures are the user's; the fetched checkpoint lives under models\ and is left alone unless the
; folder is empty. Only our own marker goes.
Type: files; Name: "{app}\config\console_root.txt"
