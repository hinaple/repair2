!macro customInstall
    DetailPrint "개발도구 설치중"
    
    StrCpy $0 "$INSTDIR\plugin-devtool" ; source

    ReadEnvStr $1 "APPDATA"
    StrCpy $2 "$1\repair2\plugin-devtool" ; dest

    ExecWait 'cmd /C rmdir /Q "$2\plugin"'
    RMDir /r "$2"

    CreateDirectory "$2"
    
    ; ExecWait 'xcopy "$0\*" "$2" /E /I /Y /H /R /C /Q'
    CopyFiles /SILENT "$0\*.*" "$2"
    
    RMDir /r $0
!macroEnd