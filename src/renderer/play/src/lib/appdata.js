import { ipcRenderer } from "electron";
import AppDataClass from "@classes/appData.svelte";
import { registerVariables } from "./variables";

let appdata;
const gamezone = document.getElementById("gamezone");

export function updateData(data = ipcRenderer.sendSync("request-data")) {
    appdata = new AppDataClass(data);
    registerVariables(appdata.variables);

    if (appdata.config.width)
        document.body.style.setProperty("--gamezone-width", `${appdata.config.width}px`);
    if (appdata.config.height)
        document.body.style.setProperty("--gamezone-height", `${appdata.config.height}px`);

    gamezone.setAttribute("style", appdata.config.styleString);
}
updateData();

ipcRenderer.on("data", (event, data) => {
    console.log(data);
    updateData(data);
});

export function getAppData() {
    return appdata;
}
