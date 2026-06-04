/** @typedef { import("./plugin/pluginManager").PluginManager } PluginManager */

import { ipcMain, dialog, shell } from "electron";
import fs from "fs/promises";
import { basename, extname, join } from "path";
import { logStore } from "./logs/logStore.js";
import { createProjectCustomLogReporter } from "./logs/projectLog.js";
import { createEmptyPlugin } from "./plugin/createEmptyPlugin";
import { pathExists } from "./pathExists";
import { checkVscodeInstalled, openVsCode } from "./vscodeUtils";

/** @param {{ getPluginManager: () => PluginManager }} setupOpt */
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
    reportDiagnostic,
    saveData,
    sendToEditor,
    sendToMain,
    serial,
    socket
}) {
    logStore.subscribe((change) => {
        sendToEditor("log:changed", change);
    });
    function reportLog(payload = {}) {
        return reportDiagnostic?.({
            ...payload,
            logType: payload.logType ?? payload.type ?? `${payload.source ?? "app"}-log`
        });
    }
    const reportProjectCustomLog = createProjectCustomLogReporter(reportLog);

    ipcMain.on("open-dir", (evt, dir) => {
        shell.openPath(dir);
    });

    //#region log IPCs
    ipcMain.handle("log:list", (evt, filter = {}) => {
        return logStore.list(filter);
    });

    ipcMain.handle("log:get", (evt, id) => {
        return logStore.get(id);
    });

    ipcMain.handle("log:resolve", (evt, groupKey) => {
        return logStore.resolve(groupKey);
    });

    ipcMain.handle("log:clear", (evt, filter = {}) => {
        return logStore.clear(filter);
    });

    ipcMain.on("log:report", async (evt, payload = {}) => {
        await reportLog(payload);
    });
    //#endregion

    //#region plugin IPCs
    ipcMain.handle("plugin:get-list", (evt) => {
        return getPluginManager().simplePluginList;
    });

    ipcMain.handle(
        "plugin:runtime:activate",
        async (evt, pluginName, { activationId, rendererMethods, attributes }) => {
            console.log("PLUGIN ACTIVATING: ", pluginName);
            const instance = await getPluginManager().mainRuntime.createInstance(
                pluginName,
                activationId
            );
            if (!instance) return null;
            try {
                await instance.activate(rendererMethods, attributes);
                return instance.mainMethods;
            } catch (err) {
                getPluginManager().mainRuntime.disposeInstance(pluginName, activationId);
                throw err;
            }
        }
    );

    ipcMain.handle("plugin:runtime:deactivate", (evt, { pluginName, activationId }) => {
        return getPluginManager()?.mainRuntime?.disposeInstance(pluginName, activationId);
    });

    ipcMain.on("plugin:runtime:deactivate-all", () => {
        getPluginManager()?.mainRuntime?.disposeAll();
    });

    ipcMain.handle(
        "plugin:runtime:to-main",
        (evt, { pluginName, activationId, methodName, args }) => {
            const instance = getPluginManager().mainRuntime.getActiveInstance(
                pluginName,
                activationId
            );
            if (!instance) return null;
            return instance.callMainMethod(methodName, args);
        }
    );

    ipcMain.handle("plugin:create", async (evt, { name, type, isExternal }) => {
        let path = null;
        if (isExternal) {
            const selected = await dialog.showOpenDialog(getEditorWindow() ?? getMainWindow(), {
                title: "Select the plugin directory",
                properties: ["openDirectory"]
            });
            if (selected.canceled) return { canceled: true };
            path = selected.filePaths[0];
        }
        const createResult = await createEmptyPlugin(name, type, { link: isExternal, root: path });
        if (createResult.error) return { canceled: true, error: createResult.error };
        if (isExternal) {
            const linkResult = await getPluginManager().pluginLinkService.addPluginLink(
                createResult.dir,
                false
            );
            if (!linkResult) return { canceled: true };
        }
        shell.openPath(createResult.dir);
        await getPluginManager().updateAllPluginInfo();
        return { dir: createResult.dir };
    });

    //#endregion

    //#region appdata IPCs
    ipcMain.on("config:is-dev", (evt) => {
        evt.returnValue = !!getData()?.config?.devMode;
    });

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

    ipcMain.handle("vscode:is-installed", () => checkVscodeInstalled());

    ipcMain.on("vscode:open", (_, src) => {
        console.log(src);
        openVsCode(src);
    });
    //#endregion

    //#region asset IPCs
    ipcMain.on("getDataDir", (evt) => {
        evt.returnValue = dataDir;
    });

    ipcMain.handle("selectFile", (event, opt) => {
        return dialog.showOpenDialog(getEditorWindow() ?? getMainWindow(), opt);
    });

    ipcMain.handle("dialogue", (event, opt) => {
        return dialog.showMessageBox(getEditorWindow() ?? getMainWindow(), {
            ...opt,
            noLink: true
        });
    });

    ipcMain.handle("copyInfoAsset", (event, srcs) => {
        return Promise.all(
            srcs.map(
                (s) =>
                    new Promise(async (res) => {
                        const ext = extname(s);
                        const bn = basename(s, ext);
                        let filename = basename(s);
                        for (let duplicatedCount = 2; ; duplicatedCount++) {
                            if (!(await pathExists(join(assetDir, filename)))) break;
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
        import("./communication/bonjour.js")
            .then(({ findService }) => findService(type, name))
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
        reportProjectCustomLog(content);
        sendToEditor("custom-log", content);
    });
    //#endregion

    ipcMain.handle("get-store", async (evt, key) => {
        return (await getStore()).get(key);
    });
    ipcMain.on("set-store", async (evt, key, value) => {
        (await getStore()).set(key, value);
    });
}
