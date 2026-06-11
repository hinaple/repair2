import type { MainToEditorSendMap, MainToPlaySendMap } from "@shared/ipc.types";
import type { MainMessage, MainState } from "./mainApp.types";

export class MainAppMessage implements MainMessage {
    #state: MainState;

    constructor(state: MainState) {
        this.#state = state;
    }

    sendToPlay = <K extends keyof MainToPlaySendMap>(
        channel: K,
        ...params: MainToPlaySendMap[K]
    ) => {
        this.#state.window.main?.webContents.send(channel, ...params);
    };

    sendToEditor = <K extends keyof MainToEditorSendMap>(
        channel: K,
        ...params: MainToEditorSendMap[K]
    ) => {
        this.#state.window.editor?.webContents.send(channel, ...params);
    };
}
