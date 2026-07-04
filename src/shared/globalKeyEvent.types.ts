import type { UiohookKeyboardEvent, UiohookKey } from "@fainthit/uiohook-napi-suppress";

export type GlobalKey = `${keyof typeof UiohookKey}`;
export type GlobalKeyEvent = UiohookKeyboardEvent & { key?: GlobalKey };
