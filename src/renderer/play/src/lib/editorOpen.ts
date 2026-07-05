import { getProject } from "../project";
import { addGlobalKeyEvent } from "./globalKey";
import { ipc } from "./ipc";

const passwordEl = document.getElementById("repair-editor-password")!;

let inputtingPassword = false;
let currentPassword = "";

function stopInputting() {
  inputtingPassword = false;
  currentPassword = "";
  passwordEl.innerText = "";
  passwordEl.style.display = "none";
}

addGlobalKeyEvent("keydown", (e) => {
  if (!e.key) return;

  const shortcutKey = getProject().data.config.editorShortcut;
  if (
    e.shiftKey &&
    e.ctrlKey &&
    e.key.toUpperCase() === (typeof shortcutKey === "string" ? shortcutKey.toUpperCase() : "E")
  ) {
    if (!getProject().data.config.editorPassword?.trim?.()?.length) {
      ipc.send("editor-on");
      return;
    }
    inputtingPassword = true;
    currentPassword = "";
    return;
  }
  if (!inputtingPassword) return;

  const PW = getProject().data.config.editorPassword?.trim();
  if (!PW) {
    ipc.send("editor-on");
    return;
  }
  if (e.key === "Shift" || e.key === "ShiftRight") return;
  if (PW[currentPassword.length] !== e.key) {
    stopInputting();
    return;
  }

  currentPassword += e.key;
  passwordEl.style.display = "block";
  passwordEl.innerText = currentPassword;

  if (currentPassword.length < PW.length) return;
  ipc.send("editor-on");
  setTimeout(stopInputting, 500);
});

window.addEventListener("click", () => {
  if (inputtingPassword) stopInputting();
});
