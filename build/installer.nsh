!macro customInstall
    DetailPrint "Plugin SDK installing..."

    StrCpy $0 "$INSTDIR\sdk" ; source

    ReadEnvStr $1 "APPDATA"
    StrCpy $2 "$1\repair2\sdk" ; dest

    RMDir /r "$2"

    CreateDirectory "$2"

    ExecWait 'xcopy "$0\*" "$2" /E /I /Y /H /R /C /Q'

    RMDir /r $0
!macroEnd
