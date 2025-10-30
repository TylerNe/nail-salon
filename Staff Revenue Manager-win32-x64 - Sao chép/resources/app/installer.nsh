; Custom installer script for Staff Revenue Manager
!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend

!macro customInstall
  ; Create data directory
  CreateDirectory "$INSTDIR\data"
  
  ; Set permissions for data directory
  AccessControl::GrantOnFile "$INSTDIR\data" "(BU)" "FullAccess"
  
  ; Create desktop shortcut
  CreateShortCut "$DESKTOP\Staff Revenue Manager.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\icon.webp"
  
  ; Create start menu shortcut
  CreateDirectory "$SMPROGRAMS\Staff Revenue Manager"
  CreateShortCut "$SMPROGRAMS\Staff Revenue Manager\Staff Revenue Manager.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\icon.webp"
  CreateShortCut "$SMPROGRAMS\Staff Revenue Manager\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
!macroend

!macro customUnInstall
  ; Remove desktop shortcut
  Delete "$DESKTOP\Staff Revenue Manager.lnk"
  
  ; Remove start menu shortcuts
  Delete "$SMPROGRAMS\Staff Revenue Manager\Staff Revenue Manager.lnk"
  Delete "$SMPROGRAMS\Staff Revenue Manager\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Staff Revenue Manager"
  
  ; Ask user if they want to keep data
  MessageBox MB_YESNO "Do you want to keep your data files?$\n$\nThis will keep the database and settings in the data folder." IDYES keep_data IDNO remove_data
  
  keep_data:
    Goto end_uninstall
  
  remove_data:
    RMDir /r "$INSTDIR\data"
    Goto end_uninstall
  
  end_uninstall:
!macroend

; Custom page for system requirements
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Custom page for system requirements check
!macro customSystemRequirementsPage
  !insertmacro MUI_PAGE_CUSTOMFUNCTION_PRE systemRequirementsPre
  !insertmacro MUI_PAGE_CUSTOMFUNCTION_SHOW systemRequirementsShow
!macroend

Function systemRequirementsPre
  ; Check Windows version
  ${If} ${AtLeastWin7}
    ; Windows 7 or higher - OK
  ${Else}
    MessageBox MB_OK "This application requires Windows 7 or higher.$\n$\nYour system is not supported."
    Quit
  ${EndIf}
  
  ; Check available disk space (at least 100MB)
  ${GetRoot} "$INSTDIR" $0
  ${DriveSpace} "$0\" "/S=M" $1
  ${If} $1 < 100
    MessageBox MB_OK "Insufficient disk space.$\n$\nThis application requires at least 100MB of free space."
    Quit
  ${EndIf}
FunctionEnd

Function systemRequirementsShow
  ; Show system requirements info
  !insertmacro MUI_HEADER_TEXT "System Requirements" "Checking system compatibility..."
FunctionEnd
