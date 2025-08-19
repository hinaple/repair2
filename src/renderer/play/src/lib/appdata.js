import "./pluginManager";
import { ipcRenderer } from "electron";
import AppDataClass from "@classes/appData.svelte";
import { registerVariables } from "./variables";
import { registerUtils } from "./globalUtils";
import initShortcuts from "./shotcut";

let appdata;
const gamezone = document.getElementById("gamezone");
const globalStyles = document.getElementById("global-styles");

export function updateData(data = ipcRenderer.sendSync("request-data")) {
    appdata = new AppDataClass(data);
    registerVariables(appdata.variables);
    initShortcuts(appdata.findAllEntry("shortcut"));

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

export function getAppData() {
    return appdata;
}

registerUtils("getAppData", getAppData);
registerUtils("getSizeRatio", () => {
    const ratio = (appdata.config.sizeRatio ?? "1").split(",").map((n) => n);
    return ratio.length === 2 ? ratio : [ratio[0], ratio[0]];
});
