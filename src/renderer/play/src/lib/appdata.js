import "./pluginManager";
import { ipcRenderer } from "electron";
import AppDataClass from "@classes/appData.svelte";
import { registerVariables } from "./variables";
import { registerUtils } from "./repairUtils";
import initShortcuts from "./shortcut";
import { sendTotalInfo } from "./runtimeMonitor";
import { activateRuntimePlugins, deactivateRuntimePlugins } from "./runtimePlugins";
import { registerPluginContextApi } from "./pluginContext";

let appdata;
const gamezone = document.getElementById("gamezone");
const globalStyles = document.getElementById("global-styles");

export function updateData(data = ipcRenderer.sendSync("request-data")) {
    appdata = new AppDataClass(data);
    registerVariables(appdata.variables);
    initShortcuts(appdata.findAllEntry("shortcut"));
    activateRuntimePlugins(appdata.config.runtimePlugins);

    sendTotalInfo();

    if (appdata.config.width)
        document.body.style.setProperty("--gamezone-width", `${appdata.config.width}px`);
    if (appdata.config.height)
        document.body.style.setProperty("--gamezone-height", `${appdata.config.height}px`);

    if (appdata.config.transparent) document.body.style.background = "transparent";

    gamezone.setAttribute("style", appdata.config.styleString);

    globalStyles.textContent = data.globalStyles;
}
updateData();

ipcRenderer.on("data", (event, data) => {
    console.log(data);
    updateData(data);
});

ipcRenderer.on("global-css", (event, css) => {
    globalStyles.textContent = css;
});

window.addEventListener("beforeunload", () => {
    deactivateRuntimePlugins();
});

/**
 * @returns {AppDataClass}
 */
export function getAppData() {
    return appdata;
}

export function getSizeRatio() {
    const ratio = (appdata.config.sizeRatio || "1")
        .toString()
        .split(",")
        .map((n) => +n);
    return ratio.length === 2 ? ratio : [ratio[0], ratio[0]];
}

registerUtils("getAppData", getAppData);
registerUtils("getSizeRatio", getSizeRatio);
registerPluginContextApi("appDataGetter", getAppData);
