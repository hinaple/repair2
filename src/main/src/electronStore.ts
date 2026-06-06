import type ElectronStore from "electron-store";

let store: ElectronStore | null = null;
let importing: Promise<any> | null = null;

export async function getStore() {
    if (importing) return importing;
    if (store) return store;
    importing = new Promise(async (res) => {
        store = new (await import("electron-store")).default();
        importing = null;
        res(store);
    });
    return importing;
}

export async function clearStore() {
    if (importing) await importing;
    if (!store) return;

    store.clear();
}
