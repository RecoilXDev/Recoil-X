[Setup]
AppId=RecoilX.UpdateB.Preview
AppName=RECOIL X Preview
AppVersion=2.0.0
DefaultDirName={localappdata}\Programs\RecoilXPreview
DefaultGroupName=RECOIL X Preview
OutputDir=..\..\dist
OutputBaseFilename=RECOIL-X-B-preview-win-x64-setup
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
Compression=lzma2
SolidCompression=yes
[Files]
Source: "..\..\build\win\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\RECOIL X Preview"; Filename: "{app}\RecoilX.exe"
Name: "{autodesktop}\RECOIL X Preview"; Filename: "{app}\RecoilX.exe"
[Run]
Filename: "{app}\RecoilX.exe"; Description: "Launch RECOIL X Preview"; Flags: nowait postinstall skipifsilent
