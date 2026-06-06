import { ipcMain } from "electron";

type PreviewIpcOptions = {
    sendToMain: (channel: string, ...params: unknown[]) => void;
};

export function setupPreviewIpc({ sendToMain }: PreviewIpcOptions) {
    ipcMain.on("request-execute", (event, { type, id }: { type: string; id: string }) => {
        sendToMain("request-execute", { type, id });
    });

    ipcMain.on("layout-preview", (event, { compData }: { compData: unknown }) => {
        sendToMain("layout-preview", { compData });
    });

    ipcMain.on("preview-content-visible", (event, visible: boolean) => {
        sendToMain("preview-content-visible", visible);
    });

    ipcMain.on("stop-preview", () => {
        sendToMain("stop-preview");
    });
}
