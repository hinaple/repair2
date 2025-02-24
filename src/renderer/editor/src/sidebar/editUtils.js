import { writable } from "svelte/store";
import { appData } from "../lib/syncData.svelte";

export const currentFocus = writable({ type: "project", obj: null });

export function focusData(type, obj = appData.config) {
    currentFocus.set({ type, obj });
}
