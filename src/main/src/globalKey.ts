import {
    uIOhook,
    UiohookKey,
    UiohookKeyboardSuppressShortcut
} from "@fainthit/uiohook-napi-suppress";

export const GlobalKeycodeMap = new Map(Object.entries(UiohookKey).map((_) => [_[1], _[0]]));

const SuppressingKeys: UiohookKeyboardSuppressShortcut[] = [
    { metaKey: true },
    { keycode: UiohookKey.F4, altKey: true },
    { keycode: UiohookKey.Tab, altKey: true },
    { keycode: UiohookKey.Space, altKey: true },
    { keycode: UiohookKey.Escape, ctrlKey: true, shiftKey: true },
    { keycode: UiohookKey.Escape, ctrlKey: true },
    { keycode: UiohookKey.Escape, altKey: true }
];

const suppressId = uIOhook.registerSuppress(SuppressingKeys);
uIOhook.toggleSuppress(suppressId, false);
let isSuppressing = false;
export function startSuppress() {
    if (isSuppressing) return;

    isSuppressing = true;

    uIOhook.toggleSuppress(suppressId, true);
}

export function stopSuppress() {
    if (!isSuppressing) return;

    isSuppressing = false;
    uIOhook.toggleSuppress(suppressId, false);
}

export function getIsSuppressing() {
    return isSuppressing;
}

type KeyEventName = "keydown" | "keyup";
type GlobalKeyListener = (type: KeyEventName, evt: any) => void;
let globalKeyListener: GlobalKeyListener | null = null;

export function setGlobalKeyListener(callback: GlobalKeyListener) {
    globalKeyListener = callback;
}

uIOhook.addListener("keydown", (evt) => callGlobalKeyListener("keydown", evt));
uIOhook.addListener("keyup", (evt) => callGlobalKeyListener("keyup", evt));

function callGlobalKeyListener(type: KeyEventName, evt: any) {
    if (!globalKeyListener) return;

    evt.key = GlobalKeycodeMap.get(evt.keycode);
    globalKeyListener(type, evt);
}

uIOhook.start();
