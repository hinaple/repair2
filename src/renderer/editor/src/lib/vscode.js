import { ipcRenderer } from "electron";

let isVscodeInstalled = false;

export function getVscode() {
    return isVscodeInstalled;
}

(async () => {
    isVscodeInstalled = await ipcRenderer.invoke("vscode:is-installed");
})();

export function openVscode(src) {
    ipcRenderer.send("vscode:open", src);
}
