const { ipcRenderer } = require("electron");

const Version = document.getElementById("version");
const Info = document.getElementById("info");
const Copy = document.getElementById("copy");

ipcRenderer.invoke("request-version").then((versionString) => {
    Version.innerText = `v${versionString}`;
    Copy.innerText = `RepairV${versionString}
    ⓒ 2026 BeyondSpace Co. All rights reserved.
    Repair™ is a trademark of BeyondSpace™ and SiwonPark.`;
});

ipcRenderer.on("startup-info", (evt, info) => {
    Info.innerText = info;
});
