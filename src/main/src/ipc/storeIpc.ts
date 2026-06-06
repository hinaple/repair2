import { ipcMain } from "electron";

type StoreLike = {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
};

type StoreIpcOptions = {
    getStore: () => Promise<StoreLike>;
};

export function setupStoreIpc({ getStore }: StoreIpcOptions) {
    ipcMain.handle("get-store", async (evt, key: string) => {
        return (await getStore()).get(key);
    });
    ipcMain.on("set-store", async (evt, key: string, value: unknown) => {
        (await getStore()).set(key, value);
    });
}
