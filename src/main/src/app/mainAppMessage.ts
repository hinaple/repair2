import type { MainToEditorSendMap, MainToPlaySendMap } from "@shared/ipc.types";
import type { MainState } from "./state";

export class MainAppMessage {
  #state: MainState;

  constructor(state: MainState) {
    this.#state = state;
  }

  sendToPlay = <K extends keyof MainToPlaySendMap>(channel: K, ...params: MainToPlaySendMap[K]) => {
    this.#state.window.main?.webContents.send(channel, ...params);
  };

  sendToEditor = <K extends keyof MainToEditorSendMap>(
    channel: K,
    ...params: MainToEditorSendMap[K]
  ) => {
    this.#state.window.editor?.webContents.send(channel, ...params);
  };
}
