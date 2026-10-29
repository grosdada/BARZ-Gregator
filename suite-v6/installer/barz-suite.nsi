Unicode True
!include "MUI2.nsh"
!include "Sections.nsh"
!include "assets\slideshow\slides.nsh"

Name "Placenta Studio"
OutFile "BARZ-Suite-6-Setup-0.33.57.exe"
InstallDir "$LOCALAPPDATA\Programs\BARZ Suite 6"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "assets\barz-suite.ico"
UninstallIcon "assets\barz-suite.ico"
!define MUI_ICON "assets\barz-suite.ico"
!define MUI_UNICON "assets\barz-suite.ico"

!if ${BARZ_SLIDE_COUNT} > 0
  !define MUI_CUSTOMFUNCTION_GUIINIT SlidesGuiInit
!endif

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

!if ${BARZ_SLIDE_COUNT} > 0
  AddBrandingImage bottom 130 0

Function SlidesGuiInit
  IfSilent slidesDone
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\slides"
  File "assets\slideshow\banner-*.bmp"
  File "assets\slideshow\poster-*.bmp"
  SetBrandingImage /RESIZETOFIT "$PLUGINSDIR\slides\banner-1.bmp"
  SetOutPath "$PLUGINSDIR"
  File /oname=barz-slideshow.exe "assets\slideshow\barz-slideshow.exe"
  Exec '"$PLUGINSDIR\barz-slideshow.exe" "$HWNDPARENT" "$PLUGINSDIR\slides" ${BARZ_SLIDE_COUNT}'
slidesDone:
FunctionEnd
!endif

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
  MessageBox MB_ICONSTOP|MB_OK "Impossible de fermer automatiquement Placenta Studio. Fermez Prompt Atlas et BARZ Aggregator, puis relancez l'installation.$\r$\n$\r$\nDétail : $1"
  Abort
runtimeUnlocked:
  SetOutPath "$INSTDIR\core"
  File /r "payload\core\*.*"
  SetOutPath "$INSTDIR"
  File "payload\manifest.json"
  File "payload\launch.vbs"
  File "assets\barz-suite.ico"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "DisplayName" "Placenta Studio"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "DisplayVersion" "0.33.57"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\BARZ Suite 6" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  IfSilent coreDone
  CreateDirectory "$SMPROGRAMS\Placenta Studio"
  CreateShortCut "$SMPROGRAMS\Placenta Studio\Désinstaller Placenta Studio.lnk" "$INSTDIR\Uninstall.exe"
  Delete "$DESKTOP\Prompt Atlas V6.lnk"
  Delete "$DESKTOP\Barz-Gregator.lnk"
  Delete "$DESKTOP\BZ Aggregator.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\Prompt Atlas V6.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\Barz-Gregator.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\BZ Aggregator.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\BARZ Suite 6.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\Désinstaller BARZ Suite 6.lnk"
  RMDir "$SMPROGRAMS\BARZ Suite 6"
coreDone:
SectionEnd

Section "BARZ Prompt Atlas" SEC_ATLAS
  SectionIn 1 2
  SetOutPath "$INSTDIR\atlas"
  File /r "payload\atlas\*.*"
SectionEnd

Section "BARZ Aggregator" SEC_AGGREGATOR
  SectionIn 1 2
  SetOutPath "$INSTDIR\aggregator"
  File /r "payload\aggregator\*.*"
SectionEnd

Section "-Lanceur Placenta Studio" SEC_LAUNCHER
  CreateDirectory "$SMPROGRAMS\Placenta Studio"
  CreateShortCut "$SMPROGRAMS\Placenta Studio\Désinstaller Placenta Studio.lnk" "$INSTDIR\Uninstall.exe"
  Delete "$DESKTOP\BARZ Suite 6.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\BARZ Suite 6.lnk"
  Delete "$SMPROGRAMS\BARZ Suite 6\Désinstaller BARZ Suite 6.lnk"
  RMDir "$SMPROGRAMS\BARZ Suite 6"
  CreateShortCut "$SMPROGRAMS\Placenta Studio\Placenta Studio.lnk" "$SYSDIR\wscript.exe" '$\"$INSTDIR\launch.vbs$\"' "$INSTDIR\barz-suite.ico" 0 SW_SHOWNORMAL "" "Placenta Studio"
  CreateShortCut "$DESKTOP\Placenta Studio.lnk" "$SYSDIR\wscript.exe" '$\"$INSTDIR\launch.vbs$\"' "$INSTDIR\barz-suite.ico" 0 SW_SHOWNORMAL "" "Placenta Studio"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Prompt Atlas V6.lnk"
  Delete "$DESKTOP\Barz-Gregator.lnk"
  Delete "$DESKTOP\BZ Aggregator.lnk"
  Delete "$DESKTOP\BARZ Suite 6.lnk"
  Delete "$DESKTOP\Placenta Studio.lnk"
  RMDir /r "$SMPROGRAMS\Placenta Studio"
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
  MessageBox MB_ICONEXCLAMATION|MB_OK "Choisissez BARZ Prompt Atlas, BARZ Aggregator, ou les deux."
  Abort
done:
FunctionEnd

Function .onInit
  IfSilent 0 done
  SectionSetFlags ${SEC_ATLAS} ${SF_SELECTED}
  SectionSetFlags ${SEC_AGGREGATOR} ${SF_SELECTED}
done:
FunctionEnd
