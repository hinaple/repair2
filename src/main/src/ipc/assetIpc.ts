import {
    ipcMain,
    dialog,
    type BrowserWindow,
    type OpenDialogOptions,
    type MessageBoxOptions
} from "electron";
import fs from "fs/promises";
import { basename, extname, join } from "path";
import { pathExists } from "../pathExists";

type AssetIpcOptions = {
    assetDir: string;
    dataDir: string;
    getDialogOwnerWindow: () => BrowserWindow | null;
};

export function setupAssetIpc({ assetDir, dataDir, getDialogOwnerWindow }: AssetIpcOptions) {
    ipcMain.on("getDataDir", (evt) => {
        evt.returnValue = dataDir;
    });

    ipcMain.handle("selectFile", (event, opt: OpenDialogOptions) => {
        const ownerWindow = getDialogOwnerWindow();
        if (ownerWindow) return dialog.showOpenDialog(ownerWindow, opt);
        return dialog.showOpenDialog(opt);
    });

    ipcMain.handle("dialogue", (event, opt: MessageBoxOptions) => {
        const options = {
            ...opt,
            noLink: true
        };
        const ownerWindow = getDialogOwnerWindow();
        if (ownerWindow) return dialog.showMessageBox(ownerWindow, options);
        return dialog.showMessageBox(options);
    });

    ipcMain.handle("copyInfoAsset", (event, srcs: string[]) => {
        return Promise.all(
            srcs.map(async (src) => {
                const ext = extname(src);
                const baseName = basename(src, ext);
                let filename = basename(src);
                for (let duplicatedCount = 2; ; duplicatedCount++) {
                    if (!(await pathExists(join(assetDir, filename)))) break;
                    filename = `${baseName}(${duplicatedCount})${ext}`;
                }
                await fs.copyFile(src, join(assetDir, filename));
                return filename;
            })
        );
    });
}
