[Setup]
; Informations de l'application
AppName=GPX Viewer
AppVersion=1.3.1
AppPublisher=Yves Balestra
AppPublisherURL=https://tresorier21000.github.io/GPX_Viewer/
AppSupportURL=https://tresorier21000.github.io/GPX_Viewer/
AppUpdatesURL=https://tresorier21000.github.io/GPX_Viewer/

; Dossier d'installation Windows par défaut
DefaultDirName={autopf}\GPX Viewer
DefaultGroupName=GPX Viewer

; Dossier et nom du fichier d'installation généré
OutputDir=.
OutputBaseFilename=Setup_GPX_Viewer_v1.3.1
SetupIconFile=favicon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "Créer une icône sur le Bureau"; GroupDescription: "Raccourcis supplémentaires :"

[Files]
; Fichiers principaux de l'application
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "style.css"; DestDir: "{app}"; Flags: ignoreversion
Source: "app.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "favicon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "favicon.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion

; Exemple de traces GPX fournies avec l'application
Source: "Traces\*"; DestDir: "{app}\Traces"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Raccourci dans le menu Démarrer
Name: "{group}\GPX Viewer"; Filename: "{app}\index.html"; IconFilename: "{app}\favicon.ico"
Name: "{group}\GPX Viewer en ligne (Google Drive)"; Filename: "https://tresorier21000.github.io/GPX_Viewer/"
Name: "{group}\Désinstaller GPX Viewer"; Filename: "{uninstallexe}"

; Raccourci sur le Bureau
Name: "{autodesktop}\GPX Viewer"; Filename: "{app}\index.html"; Tasks: desktopicon; IconFilename: "{app}\favicon.ico"

[Run]
; Lancer l'application à la fin de l'installation
Filename: "{app}\index.html"; Description: "Lancer GPX Viewer"; Flags: shellexec postinstall skipifsilent
