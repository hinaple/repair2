import { ipcRenderer } from "electron";
import { genElement } from "./resources";
import { getAppData } from "./appdata";
import Coord from "@classes/coord";

const previewComponent = document.getElementById("preview-component");

let currentPreview = null;
let els = [];
ipcRenderer.on("layout-preview", (event, { compData }) => {
    currentPreview = compData;
    console.log(compData);
    render();
});
ipcRenderer.on("stop-preview", () => {
    currentPreview = null;
    render();
});

function elStyleString(elData) {
    if (elData.fullscreen)
        return (
            "position: absolute;" +
            "width: var(--gamezone-width); height: var(--gamezone-height);" +
            "left: 0; top: 0;"
        );
    const pos = new Coord(elData.pos);
    return (
        (elData.absolute ? `position: absolute;${pos.styleString}` : "") +
        `width: ${elData.width ? `${elData.width}px` : "auto"};` +
        `height: ${elData.height ? `${elData.height}px` : "auto"};`
    );
}

function render() {
    if (!currentPreview) {
        previewComponent.innerHTML = "";
        previewComponent.style.display = "none";
        els = [];
        return;
    }

    previewComponent.style.display = "block";
    previewComponent.setAttribute("style", new Coord(currentPreview.pos).styleString);
    if (currentPreview.elements.length > els.length) {
        els.splice(0, currentPreview.elements.length - els.length).forEach((el) => {
            previewComponent.removeChild(el.el);
        });
    }

    const appdata = getAppData();
    currentPreview.elements.forEach((el, idx) => {
        let currentEl;
        if (els.length === idx) {
            const el = document.createElement("div");
            el.className = "preview-element";
            previewComponent.appendChild(el);
            currentEl = { el, resourceId: el.payload?.resourceId ?? null, child: null };
            els.push(currentEl);
        } else {
            currentEl = els[idx];
        }

        if (el.className?.length) currentEl.el.className = `${el.className} preview-element`;
        currentEl.el.setAttribute("style", elStyleString(el));

        if (el.type[0] !== "video" && el.type[0] !== "image") {
            currentEl.el.innerHTML = "";
            currentEl.resourceId = null;
            return;
        }

        if (currentEl.resourceId !== el.payload.resourceId) {
            currentEl.resourceId = el.payload.resourceId;
            currentEl.el.innerHTML = "";

            const child = genElement(appdata.findResourceById(el.payload.resourceId), false, true);
            child.style.opacity = 0.5;
            if (el.type[0] === "video") {
                child.controls = true;
                child.muted = true;
            }
            currentEl.el.appendChild(child);
            currentEl.child = child;
        }

        currentEl.child.style.width = el.fullscreen
            ? "var(--gamezone-width)"
            : el.width
              ? `${el.width}px`
              : "auto";
        currentEl.child.style.height = el.fullscreen
            ? "var(--gamezone-height)"
            : el.height
              ? `${el.height}px`
              : "auto";
    });
}
