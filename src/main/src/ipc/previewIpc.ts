import { ipc } from "./ipcMethods";

type PreviewIpcOptions = {
    sendToMain: (channel: string, ...params: unknown[]) => void;
};

export function setupPreviewIpc({ sendToMain }: PreviewIpcOptions) {
    ipc.on("request-execute", (event, { type, id }: { type: string; id: string }) => {
        sendToMain("request-execute", { type, id });
    });

    ipc.on("layout-preview", (event, { compData }: { compData: unknown }) => {
        sendToMain("layout-preview", { compData });
    });

    ipc.on("preview-content-visible", (event, visible: boolean) => {
        sendToMain("preview-content-visible", visible);
    });

    ipc.on("stop-preview", () => {
        sendToMain("stop-preview");
    });
}
