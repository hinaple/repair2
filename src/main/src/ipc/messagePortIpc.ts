import { MessageChannelMain, type WebContents } from "electron";
import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupMessagePortIpc(app: MainApp) {
  let readyPlay: WebContents | null = null;
  let readyEditor: WebContents | null = null;

  ipc.on("message-port:ready", (event) => {
    const play = app.state.window.main?.webContents;
    const editor = app.state.window.editor?.webContents;

    if (event.sender === play) readyPlay = event.sender;
    else if (event.sender === editor) readyEditor = event.sender;
    else return;

    if (!play || !editor || play.isDestroyed() || editor.isDestroyed()) return;
    if (readyPlay !== play || readyEditor !== editor) return;

    const channel = new MessageChannelMain();
    play.postMessage("messagePort", null, [channel.port1]);
    editor.postMessage("messagePort", null, [channel.port2]);
  });
}
