import { ipcRenderer } from "electron";
import AppDataClass from "@classes/appData.svelte";

let fileData;
updateData();

export function updateData() {
    fileData = new AppDataClass(ipcRenderer.sendSync("request-data"));
}
export default fileData;
