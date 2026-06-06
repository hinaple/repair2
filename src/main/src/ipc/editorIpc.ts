import { ipcMain, type BrowserWindow } from "electron";
import { checkVscodeInstalled, openVsCode } from "../vscodeUtils";

type EditorIpcOptions = {
    getEditorWindow: () => BrowserWindow | null;
    createEditorWindow: () => void;
};

export function setupEditorIpc({ getEditorWindow, createEditorWindow }: EditorIpcOptions) {
    ipcMain.on("editor-on", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) createEditorWindow();
        else editorWindow.focus();
    });

    ipcMain.on("unsaved", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) return;
        editorWindow.setTitle("Editor ●");
    });

    ipcMain.on("saved", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) return;
        editorWindow.setTitle("Editor");
    });

    ipcMain.handle("vscode:is-installed", () => checkVscodeInstalled());

    ipcMain.on("vscode:open", (_, src: string) => {
        openVsCode(src);
    });
}
