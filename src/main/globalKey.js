import { uIOhook, UiohookKey } from "@fainthit/uiohook-napi-suppress";

const SuppressingKeys = [
    { metaKey: true },
    { keycode: UiohookKey.F4, altKey: true },
    { keycode: UiohookKey.Tab, altKey: true },
    { keycode: UiohookKey.Escape, ctrlKey: true, shiftKey: true }
];

let suppressId = null;
let isSuppressing = false;
export function startSuppress() {
    if (isSuppressing) return;

    if (suppressId === null) suppressId = uIOhook.registerSuppress(SuppressingKeys);
    isSuppressing = true;

    uIOhook.toggleSuppress(suppressId, true);

    console.log("SUPPRESSING STARTED");
}

export function stopSuppress() {
    if (suppressId === null || !isSuppressing) return;

    uIOhook.toggleSuppress(suppressId, false);
}

export function getIsSuppressing() {
    return isSuppressing;
}

uIOhook.on("keydown", (e) => {
    console.log(e.type, e.keycode);
});

uIOhook.start();
