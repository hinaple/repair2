import { ipc } from "./ipc";

let isVscodeInstalled = false;

export function getVscode() {
    return isVscodeInstalled;
}

(async () => {
    isVscodeInstalled = await ipc.invoke("vscode:is-installed");
})();

export function openVscode(src) {
    ipc.send("vscode:open", src);
}
