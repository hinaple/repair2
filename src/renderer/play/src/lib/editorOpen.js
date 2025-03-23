import { ipcRenderer } from "electron";
import { getAppData } from "./appdata";

const passwordEl = document.getElementById("repair-editor-password");

let inputtingPassword = false;
let currentPassword = "";

function stopInputting() {
    inputtingPassword = false;
    currentPassword = "";
    passwordEl.innerText = "";
    passwordEl.style.display = "none";
}

window.addEventListener("keydown", (e) => {
    if (
        e.shiftKey &&
        e.ctrlKey &&
        e.key.toUpperCase() ===
            (getAppData().config.editorShortcut?.length
                ? getAppData().config.editorShortcut.toUpperCase()
                : "E")
    ) {
        if (!getAppData().config.editorPassword?.trim?.()?.length) {
            ipcRenderer.send("editor-on");
            return;
        }
        inputtingPassword = true;
        currentPassword = "";
        return;
    }
    if (!inputtingPassword) return;

    const PW = getAppData().config.editorPassword?.trim();
    if (e.key === "Shift") return;
    if (PW[currentPassword.length] !== e.key) {
        stopInputting();
        return;
    }

    currentPassword += e.key;
    passwordEl.style.display = "block";
    passwordEl.innerText = currentPassword;

    if (currentPassword.length < PW.length) return;
    ipcRenderer.send("editor-on");
    setTimeout(stopInputting, 500);
});

window.addEventListener("click", () => {
    if (inputtingPassword) stopInputting();
});
