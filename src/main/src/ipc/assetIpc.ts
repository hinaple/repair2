import fs from "fs/promises";
import { basename, extname, join } from "path";
import { pathExists } from "../system/pathExists";
import type { MainApp } from "../app/mainApp";
import { ipc } from "./ipcMethods";

export function setupAssetIpc(app: MainApp) {
    ipc.on("getDataDir", (evt) => {
        evt.returnValue = app.paths.dataDir;
    });

    ipc.handle("selectFile", (event, opt) => {
        return app.system.dialog.showOpenDialog(opt);
    });

    ipc.handle("dialog", (event, opt) => {
        return app.system.dialog.showMessageBox({
            ...opt,
            noLink: true
        });
    });

    ipc.handle("copyInfoAsset", (event, srcs: string[]) => {
        return Promise.all(
            srcs.map(async (src) => {
                const ext = extname(src);
                const baseName = basename(src, ext);
                let filename = basename(src);
                for (let duplicatedCount = 2; ; duplicatedCount++) {
                    if (!(await pathExists(join(app.paths.assetDir, filename)))) break;
                    filename = `${baseName}(${duplicatedCount})${ext}`;
                }
                await fs.copyFile(src, join(app.paths.assetDir, filename));
                return filename;
            })
        );
    });
}
