import { ipcRenderer } from "electron";

const MaxHistoryLen = 50;

let history = [];
let saveIdx = 0;
let currentCursor = 0;
function setCurrentCursor(v) {
    currentCursor = v;
    ipcRenderer.send(currentCursor !== saveIdx ? "unsaved" : "saved");
}

export function addHistory({ doFn, undoFn = null, doData = null, undoData = null }) {
    doFn(doData);
    if (history.length > currentCursor) history = history.toSpliced(currentCursor);
    const tempHistory = { redo: doFn, undo: undoFn || doFn, doData, undoData: undoData };
    history.push(tempHistory);
    console.log("NEW HISTORY", history[currentCursor]);
    setCurrentCursor(currentCursor + 1);
    if (history.length > MaxHistoryLen) {
        const offset = history.length - MaxHistoryLen;
        history = history.toSpliced(0, offset);
        currentCursor -= offset;
        saveIdx -= offset;
    }

    return (newValue) => {
        tempHistory.doData = newValue;
    };
}
export function undo() {
    if (currentCursor <= 0) return;
    setCurrentCursor(currentCursor - 1);
    history[currentCursor].undo(history[currentCursor].undoData);
}
export function redo() {
    if (currentCursor >= history.length) return;
    history[currentCursor].redo(history[currentCursor].doData);
    setCurrentCursor(currentCursor + 1);
}
export function clearHistory() {
    history = [];
    setCurrentCursor(0);
}
export function updateSaveIdx() {
    saveIdx = currentCursor;
    ipcRenderer.send("saved");
}

ipcRenderer.on("undo", undo);
ipcRenderer.on("redo", redo);
