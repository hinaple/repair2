/** @typedef { import("./plugin/pluginManager").PluginManager } PluginManager */

import { ipcMain, dialog } from "electron";
import fs from "fs/promises";
import { basename, extname, join } from "path";

/**
 *
 * @param {{
 *     assetDir: string,
 *     dataDir: string,
 *     getData: any,
 *     getEditorWindow: any,
 *     getGlobalCss: any,
 *     getMainWindow: any,
 *     getPluginManager: () => PluginManager,
 *     getStore: any,
 *     createEditorWindow: any,
 *     findService: any,
 *     makeLog: any,
 *     saveData: any,
 *     sendToEditor: any,
 *     sendToMain: any,
 *     serial: any,
 *     socket: any,
 * }} options
 */
export function setupIpcHandlers({
    assetDir,
    dataDir,
    getData,
    getEditorWindow,
    getGlobalCss,
    getMainWindow,
    getPluginManager,
    getStore,
    createEditorWindow,
    findService,
    makeLog,
    saveData,
    sendToEditor,
    sendToMain,
    serial,
    socket
}) {
    //#region plugin IPCs
    ipcMain.handle("plugin:get-list", (evt, withTypes = false) => {
        return withTypes
            ? getPluginManager().pluginListWithTypes
            : getPluginManager().simplePluginList;
    });

    ipcMain.handle(
        "plugin:runtime:activate",
        async (evt, pluginName, { rendererMethods, attributes }) => {
            console.log("PLUGIN ACTIVATING: ", pluginName);
            const instance = await getPluginManager().mainRuntime.createInstance(pluginName);
            if (!instance) return null;
            await instance.activate(rendererMethods, attributes);
            return instance.mainMethods;
        }
    );

    ipcMain.handle("plugin:runtime:to-main", (evt, { pluginName, methodName, args }) => {
        const instance = getPluginManager().mainRuntime.getPluginInstance(pluginName);
        if (!instance) return null;
        return instance.callMainMethod(methodName, args);
    });

    //#endregion

    //#region appdata IPCs
    ipcMain.on("request-data", (evt) => {
        evt.returnValue = { ...getData(), globalStyles: getGlobalCss() };
    });

    ipcMain.handle("update-data", (evt, tempData) => {
        sendToMain("data", { ...tempData, globalStyles: getGlobalCss() });
        return saveData(tempData);
    });
    //#endregion

    //#region editor IPCs
    ipcMain.on("editor-on", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) createEditorWindow();
        else editorWindow.focus();
    });

    ipcMain.on("unsaved", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) return;
        editorWindow.setTitle("Editor ●");
    });

    ipcMain.on("saved", () => {
        const editorWindow = getEditorWindow();
        if (!editorWindow) return;
        editorWindow.setTitle("Editor");
    });
    //#endregion

    //#region asset IPCs
    ipcMain.on("getDataDir", (evt) => {
        evt.returnValue = dataDir;
    });

    ipcMain.on("selectFile", async (event, opt) => {
        event.returnValue = await dialog.showOpenDialogSync(opt);
    });

    ipcMain.on("dialogue", async (event, opt) => {
        event.returnValue = await dialog.showMessageBoxSync({ ...opt, noLink: true });
    });

    ipcMain.on("copyInfoAsset", async (event, srcs) => {
        event.returnValue = await Promise.all(
            srcs.map(
                (s) =>
                    new Promise(async (res) => {
                        const ext = extname(s);
                        const bn = basename(s, ext);
                        let filename = basename(s);
                        for (let duplicatedCount = 2; ; duplicatedCount++) {
                            if (
                                await fs
                                    .access(join(assetDir, filename), fs.constants.F_OK)
                                    .then(() => false)
                                    .catch(() => true)
                            )
                                break;
                            filename = `${bn}(${duplicatedCount})${ext}`;
                        }
                        await fs.copyFile(s, join(assetDir, filename));
                        res(filename);
                    })
            )
        );
    });
    //#endregion

    //#region preview IPCs
    ipcMain.on("request-execute", (event, { type, id }) => {
        sendToMain("request-execute", { type, id });
    });

    ipcMain.on("layout-preview", (event, { compData }) => {
        sendToMain("layout-preview", { compData });
    });

    ipcMain.on("preview-content-visible", (event, visible) => {
        sendToMain("preview-content-visible", visible);
    });

    ipcMain.on("stop-preview", () => {
        sendToMain("stop-preview");
    });
    //#endregion

    //#region communication IPCs
    ipcMain.on("socket-connect", (event, urls) => {
        socket
            .connect(typeof urls === "string" ? urls.trim().split("\n") : urls)
            .then((connected) => {
                if (!connected) sendToEditor("socket-failed");
            });
    });
    ipcMain.on("socket-connect-service", (event, type, name) => {
        if (socket.connected) return;
        findService(type, name)
            .then((urls) => {
                socket.connect(urls).then((connected) => {
                    if (!connected) sendToEditor("socket-failed");
                });
            })
            .catch(() => {});
    });
    ipcMain.on("socket-send", (event, channel, ...data) => {
        socket.send(channel, ...data);
    });
    ipcMain.on("socket-disconnect", () => {
        socket.disconnect();
    });

    ipcMain.on("serial-open", (event, alias, port, baudRate) => {
        serial.open(alias, port, baudRate);
    });
    ipcMain.on("serial-send", (event, data) => {
        serial.send(data);
    });
    ipcMain.on("serial-close", () => {
        serial.close();
    });
    //#endregion

    //#region player monitoring IPCs
    ipcMain.on("monitor-event", (event, ...data) => {
        sendToMain("monitor-event", ...data);
    });
    ipcMain.on("monitor-info", (event, ...data) => {
        sendToEditor("monitor-info", ...data);
    });

    ipcMain.on("custom-log", (evt, content) => {
        sendToEditor("custom-log", content);
    });

    ipcMain.on("plugin-log", async (evt, payload = {}) => {
        const level = payload.level ?? "info";
        const title = payload.title ?? "Plugin message";
        let detail = payload.detail ?? "";

        if (level === "error") {
            try {
                const logFile = await makeLog(
                    "plugin-error",
                    [title, payload.plugin ? JSON.stringify(payload.plugin, null, 4) : null, detail]
                        .filter(Boolean)
                        .join("\n\n")
                );
                detail = [detail, `A plugin error occurred: ${logFile}`]
                    .filter(Boolean)
                    .join("\n\n");
            } catch {}
        }

        sendToEditor("plugin-log", { level, title, detail, plugin: payload.plugin ?? null });

        if (!payload.dialogue) return;

        const parentWindow = getEditorWindow() ?? getMainWindow();
        dialog.showMessageBox(parentWindow, {
            type: level === "error" ? "error" : level === "warning" ? "warning" : "info",
            title,
            message: title,
            detail,
            noLink: true
        });
    });
    //#endregion

    ipcMain.on("get-store", (evt, key) => {
        evt.returnValue = getStore().get(key);
    });
    ipcMain.on("set-store", (evt, key, value) => {
        getStore().set(key, value);
    });
}
