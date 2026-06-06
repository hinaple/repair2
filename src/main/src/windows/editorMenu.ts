import { Menu, type MenuItemConstructorOptions } from "electron";
import type { MainContext } from "../app/mainContext.types";

export function createEditorMenu({
    state,
    service,
    controllers,
    editorSave,
    message,
    paths,
    system
}: MainContext) {
    const { app, dialog, shell } = system;
    const { dataDir, emptyProjectFile } = paths;
    const { requestEditorSave } = editorSave;
    const { sendToEditor } = message;

    const template: MenuItemConstructorOptions[] = [
        {
            label: "파일",
            submenu: [
                {
                    label: "새 프로젝트",
                    click: async () => {
                        const { response } = await dialog.showMessageBox(state.window.editor!, {
                            type: "info",
                            title: "프로젝트 내보내기",
                            message: "현재 편집 중인 프로젝트 정보가 삭제됩니다.",
                            detail: "현재 프로젝트를 먼저 내보낼까요?",
                            buttons: ["내보내기", "내보내지 않음", "취소"],
                            defaultId: 0,
                            cancelId: 2,
                            noLink: true
                        });
                        if (response === 2) return;
                        if (
                            response === 0 &&
                            !(await service.projectFileManager.exportProject(
                                controllers.project.getProjectExportName()
                            ))
                        )
                            return;

                        await service.projectFileManager.importProject(emptyProjectFile);
                    },
                    accelerator: "CommandOrControl+N"
                },
                { type: "separator" },
                {
                    label: "저장",
                    click: async () => {
                        await requestEditorSave();
                    },
                    accelerator: "CommandOrControl+S"
                },
                { type: "separator" },
                {
                    label: "프로젝트 불러오기",
                    click: async () => {
                        if (!(await service.projectFileManager.selectImportProject())) return;
                        controllers.window.createEditorWindow();
                    },
                    accelerator: "CommandOrControl+Shift+O"
                },
                {
                    label: "프로젝트 내보내기",
                    click: async () => {
                        if (!(await requestEditorSave())) return;
                        await service.projectFileManager.exportProject(
                            controllers.project.getProjectExportName()
                        );
                    },
                    accelerator: "CommandOrControl+Shift+S"
                },
                { type: "separator" },
                {
                    label: "데이터 폴더 열기",
                    click: () => {
                        shell.openPath(dataDir);
                    }
                },
                { type: "separator" },
                {
                    label: "RepairV2 종료",
                    click: () => {
                        app.quit();
                    },
                    accelerator: "CommandOrControl+Q"
                }
            ]
        },
        {
            label: "편집",
            submenu: [
                {
                    label: "취소",
                    click: () => {
                        sendToEditor("undo");
                    },
                    accelerator: "CommandOrControl+Z"
                },
                {
                    label: "재실행",
                    click: () => {
                        sendToEditor("redo");
                    },
                    accelerator: "CommandOrControl+Shift+Z"
                }
            ]
        },
        {
            label: "도구",
            submenu: [
                {
                    label: "편집기 콘솔",
                    click: () => {
                        state.window.editor?.webContents.toggleDevTools();
                    },
                    accelerator: "CommandOrControl+Shift+I"
                },
                {
                    label: "플레이 콘솔",
                    click: () => {
                        state.window.main?.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: "플러그인",
            submenu: [
                {
                    label: "새 플러그인 생성",
                    click: () => sendToEditor("plugin:show-create-modal")
                },
                {
                    label: "플러그인 전체 다시 빌드",
                    click: async () => {
                        if (!service.pluginManager) return;
                        await service.pluginManager.updateAllPluginInfo({ forceBuild: true });
                    }
                }
            ]
        },
        {
            label: "보기",
            submenu: [
                {
                    label: "확대",
                    click: () => {
                        sendToEditor("zoom", 1);
                    },
                    accelerator: "CommandOrControl+="
                },
                {
                    label: "축소",
                    click: () => {
                        sendToEditor("zoom", -1);
                    },
                    accelerator: "CommandOrControl+-"
                },
                {
                    label: "화면에 맞추기",
                    click: () => {
                        sendToEditor("zoom-fit");
                    },
                    accelerator: "CommandOrControl+0"
                },
                { type: "separator" },
                {
                    label: "편집기 새로고침",
                    click: () => {
                        state.window.editor?.webContents.reloadIgnoringCache();
                    },
                    accelerator: "CommandOrControl+R"
                }
            ]
        }
    ];

    return Menu.buildFromTemplate(template);
}
