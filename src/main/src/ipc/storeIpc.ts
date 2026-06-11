import { ipc } from "./ipcMethods";

type StoreLike = {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
};

type StoreIpcOptions = {
    getStore: () => Promise<StoreLike>;
};

export function setupStoreIpc({ getStore }: StoreIpcOptions) {
    ipc.handle("get-store", async (evt, key: string) => {
        return (await getStore()).get(key);
    });
    ipc.on("set-store", async (evt, key: string, value: unknown) => {
        (await getStore()).set(key, value);
    });
}
