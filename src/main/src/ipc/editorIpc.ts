import type { BrowserWindow } from "electron";
import { checkVscodeInstalled, openVsCode } from "../vscodeUtils";
import { ipc } from "./ipcMethods";

type EditorIpcOptions = {
    getEditorWindow: () => BrowserWindow | null;
    createEditorWindow: () => void;
};

export function setupEditorIpc({ getEditorWindow, createEditorWindow }: EditorIpcOptions) {
    ipc.on("editor-on", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) createEditorWindow();
        else editorWindow.focus();
    });

    ipc.on("unsaved", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) return;
        editorWindow.setTitle("Editor ●");
    });

    ipc.on("saved", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) return;
        editorWindow.setTitle("Editor");
    });

    ipc.handle("vscode:is-installed", () => checkVscodeInstalled());

    ipc.on("vscode:open", (_, src: string) => {
        openVsCode(src);
    });
}
