Function CopyToUserData
    StrCpy $0 "${BUILD_RESOURCES_DIR}\plugin-devtool" ; source

    ReadEnvStr $1 "APPDATA"
    StrCpy $2 "$1\repair2\plugin-devtool" ; dest

    ExecWait 'cmd /C rmdir /Q "$2\plugin"'
    RMDir /r "$2"

    CreateDirectory "$2"
    
    ; ExecWait 'xcopy "$0\*" "$2" /E /I /Y /H /R /C /Q'
    CopyFiles /SILENT "$0\*.*" "$2"
FunctionEnd

Section .onInstSuccess
    Call CopyToUserData
SectionEnd