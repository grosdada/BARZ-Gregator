Unicode True
!include "MUI2.nsh"
!include "Sections.nsh"

Name "BARZ Suite 6"
OutFile "BARZ-Suite-6-Setup-0.33.50.exe"
InstallDir "$LOCALAPPDATA\Programs\BARZ Suite 6"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "assets\barz-suite.ico"
UninstallIcon "assets\barz-suite.ico"
!define MUI_ICON "assets\barz-suite.ico"
!define MUI_UNICON "assets\barz-suite.ico"

!insertmacro MUI_PAGE_WELCOME
PageEx components
  PageCallbacks "" "" ComponentsLeave
PageExEnd
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "French"

Section "Runtime partagé (requis)" SEC_CORE
  SectionIn RO
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File /oname=stop-barz-processes.ps1 "stop-barz-processes.ps1"
  StrCpy $0 "$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
  IfFileExists "$0" powerShellReady
  StrCpy $0 "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"
powerShellReady:
  nsExec::ExecToStack '"$0" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\stop-barz-processes.ps1" -InstallDir "$INSTDIR"'
  Pop $0
  Pop $1
  StrCmp $0 "0" runtimeUnlocked
  MessageBox MB_ICONSTOP|MB_OK "Impossible de fermer automatiquement BARZ Suite 6. Fermez Prompt Atlas et Barz-Gregator, puis relancez l'installation.$\r$\n$\r$\nDétail : $1"
  Abort
runtimeUnlocked:
  SetOutPath "$INSTDIR\core"
  File /r "payload\core\*.*"
  SetOutPath "$INSTDIR"
  File "payload\manifest.json"
  File "payload\launch.vbs"
  File "assets\barz-suite.ico"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "DisplayName" "BARZ Suite 6"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "DisplayVersion" "0.33.50"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  IfSilent coreDone
  CreateDirectory "$SMPROGRAMS\BARZ Suite 6"
  CreateShortCut "$SMPROGRAMS\BARZ Suite 6\Désinstaller BARZ Suite 6.lnk" "$INSTDIR\Uninstall.exe"
  Delete "$DESKTOP\Prompt Atlas V6.lnk"
  Delete "$DESKTOP\Barz-Gregator.lnk"
  Delete "$DESKTOP\BZ Aggregator.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\Prompt Atlas V6.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\Barz-Gregator.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\BZ Aggregator.lnk"
coreDone:
SectionEnd

Section "Prompt Atlas V6" SEC_ATLAS
  SectionIn 1 2
  SetOutPath "$INSTDIR\atlas"
  File /r "payload\atlas\*.*"
SectionEnd

Section "Barz-Gregator" SEC_AGGREGATOR
  SectionIn 1 2
  SetOutPath "$INSTDIR\aggregator"
  File /r "payload\aggregator\*.*"
SectionEnd

Section "-Lanceur BARZ Suite 6" SEC_LAUNCHER
  IfSilent launcherDone
  CreateShortCut "$SMPROGRAMS\BARZ Suite 6\BARZ Suite 6.lnk" "$SYSDIR\wscript.exe" '$\"$INSTDIR\launch.vbs$\"' "$INSTDIR\barz-suite.ico" 0 SW_SHOWNORMAL "" "BARZ Suite 6"
  CreateShortCut "$DESKTOP\BARZ Suite 6.lnk" "$SYSDIR\wscript.exe" '$\"$INSTDIR\launch.vbs$\"' "$INSTDIR\barz-suite.ico" 0 SW_SHOWNORMAL "" "BARZ Suite 6"
launcherDone:
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Prompt Atlas V6.lnk"
  Delete "$DESKTOP\Barz-Gregator.lnk"
  Delete "$DESKTOP\BZ Aggregator.lnk"
  Delete "$DESKTOP\BARZ Suite 6.lnk"
  RMDir /r "$SMPROGRAMS\BARZ Suite 6"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6"
  RMDir /r "$INSTDIR"
SectionEnd

Function ComponentsLeave
  SectionGetFlags ${SEC_ATLAS} $0
  IntOp $0 $0 & ${SF_SELECTED}
  SectionGetFlags ${SEC_AGGREGATOR} $1
  IntOp $1 $1 & ${SF_SELECTED}
  IntOp $2 $0 | $1
  StrCmp $2 0 0 done
  MessageBox MB_ICONEXCLAMATION|MB_OK "Choisissez Prompt Atlas, Barz-Gregator, ou les deux."
  Abort
done:
FunctionEnd

Function .onInit
  IfSilent 0 done
  SectionSetFlags ${SEC_ATLAS} ${SF_SELECTED}
  SectionSetFlags ${SEC_AGGREGATOR} ${SF_SELECTED}
done:
FunctionEnd
