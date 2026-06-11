import {
    uIOhook,
    UiohookKey,
    UiohookKeyboardSuppressShortcut
} from "@fainthit/uiohook-napi-suppress";

type KeyEventName = "keydown" | "keyup";
type GlobalKeyListener = (type: KeyEventName, evt: any) => void;

const SuppressingKeys: UiohookKeyboardSuppressShortcut[] = [
    { metaKey: true },
    { keycode: UiohookKey.F4, altKey: true },
    { keycode: UiohookKey.Tab, altKey: true },
    { keycode: UiohookKey.Space, altKey: true },
    { keycode: UiohookKey.Escape, ctrlKey: true, shiftKey: true },
    { keycode: UiohookKey.Escape, ctrlKey: true },
    { keycode: UiohookKey.Escape, altKey: true }
];

export class GlobalKey {
    #globalKeycodeMap = new Map(Object.entries(UiohookKey).map((_) => [_[1], _[0]]));
    #suppressId = uIOhook.registerSuppress(SuppressingKeys);
    #globalKeyListener: GlobalKeyListener | null = null;

    isSuppressing = false;

    constructor() {
        uIOhook.toggleSuppress(this.#suppressId, this.isSuppressing);

        uIOhook.addListener("keydown", (evt) => this.callGlobalKeyListener("keydown", evt));
        uIOhook.addListener("keyup", (evt) => this.callGlobalKeyListener("keyup", evt));

        uIOhook.start();
    }
    startSuppress() {
        if (this.isSuppressing) return;

        this.isSuppressing = true;

        uIOhook.toggleSuppress(this.#suppressId, true);
    }
    stopSuppress() {
        if (!this.isSuppressing) return;

        this.isSuppressing = false;
        uIOhook.toggleSuppress(this.#suppressId, false);
    }
    setGlobalKeyListener(callback: GlobalKeyListener) {
        this.#globalKeyListener = callback;
    }
    callGlobalKeyListener(type: KeyEventName, evt: any) {
        if (!this.#globalKeyListener) return;

        evt.key = this.#globalKeycodeMap.get(evt.keycode);
        this.#globalKeyListener(type, evt);
    }
}
