import { Menu, type MenuItemConstructorOptions } from "electron";
import type { MainApp } from "../app/mainApp";

export function createEditorMenu(app: MainApp) {
    const template: MenuItemConstructorOptions[] = [
        {
            label: "파일",
            submenu: [
                {
                    label: "새 프로젝트",
                    click: async () => {
                        const { response } = await app.system.dialog.showMessageBox({
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
                            !(await app.service.projectFileManager.exportProject(
                                app.controllers.project.getProjectExportName()
                            ))
                        )
                            return;

                        await app.service.projectFileManager.importProject(
                            app.paths.emptyProjectFile
                        );
                    },
                    accelerator: "CommandOrControl+N"
                },
                { type: "separator" },
                {
                    label: "저장",
                    click: async () => {
                        await app.editorSave.requestEditorSave();
                    },
                    accelerator: "CommandOrControl+S"
                },
                { type: "separator" },
                {
                    label: "프로젝트 불러오기",
                    click: async () => {
                        if (!(await app.service.projectFileManager.selectImportProject())) return;
                        app.controllers.window.createEditorWindow();
                    },
                    accelerator: "CommandOrControl+Shift+O"
                },
                {
                    label: "프로젝트 내보내기",
                    click: async () => {
                        if (!(await app.editorSave.requestEditorSave())) return;
                        await app.service.projectFileManager.exportProject(
                            app.controllers.project.getProjectExportName()
                        );
                    },
                    accelerator: "CommandOrControl+Shift+S"
                },
                { type: "separator" },
                {
                    label: "데이터 폴더 열기",
                    click: () => {
                        app.system.shell.openPath(app.paths.dataDir);
                    }
                },
                { type: "separator" },
                {
                    label: "RepairV2 종료",
                    click: () => {
                        app.system.app.quit();
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
                        app.message.sendToEditor("undo");
                    },
                    accelerator: "CommandOrControl+Z"
                },
                {
                    label: "재실행",
                    click: () => {
                        app.message.sendToEditor("redo");
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
                        app.state.window.editor?.webContents.toggleDevTools();
                    },
                    accelerator: "CommandOrControl+Shift+I"
                },
                {
                    label: "플레이 콘솔",
                    click: () => {
                        app.state.window.main?.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: "플러그인",
            submenu: [
                {
                    label: "새 플러그인 생성",
                    click: () => app.message.sendToEditor("plugin:show-create-modal")
                },
                {
                    label: "플러그인 전체 다시 빌드",
                    click: async () => {
                        if (!app.service.pluginManager) return;
                        await app.service.pluginManager.updateAllPluginInfo({ forceBuild: true });
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
                        app.message.sendToEditor("zoom", 1);
                    },
                    accelerator: "CommandOrControl+="
                },
                {
                    label: "축소",
                    click: () => {
                        app.message.sendToEditor("zoom", -1);
                    },
                    accelerator: "CommandOrControl+-"
                },
                {
                    label: "화면에 맞추기",
                    click: () => {
                        app.message.sendToEditor("zoom-fit");
                    },
                    accelerator: "CommandOrControl+0"
                },
                { type: "separator" },
                {
                    label: "편집기 새로고침",
                    click: () => {
                        app.state.window.editor?.webContents.reloadIgnoringCache();
                    },
                    accelerator: "CommandOrControl+R"
                }
            ]
        }
    ];

    return Menu.buildFromTemplate(template);
}
