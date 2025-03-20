import { setVar } from "../lib/variables";
import { genElement } from "../lib/resources";
import { getAppData } from "../lib/appdata";

const regexMap = {
    english: /[a-z]/gi,
    number: /[0-9]/g,
    korean: /[ㄱ-ㅎ가-힣]/g
};

export default class RepairElement extends HTMLElement {
    constructor(element) {
        super();

        this.setAttribute("style", element.styleString);

        if (element.className) this.classList.add(element.className);

        this.type = element.types[0];

        if (this.type === "empty") {
            this.realEl = document.createElement("div");
            if (element.payload.content)
                this.realEl[element.payload.isHtml ? "innerHTML" : "textContent"] =
                    element.payload.content;
        } else if (this.type === "input") {
            this.realEl = document.createElement("input");
            if (element.payload.placeholder) this.realEl.placeholder = element.payload.placeholder;

            if (!element.payload.allowedType || element.payload.allowedType === "any")
                this.allowedRegex = null;
            else if (element.payload.allowedType === "regex")
                this.allowedRegex = new RegExp(element.payload.allowedRegex, "g");
            else this.allowedRegex = regexMap[element.payload.allowedType] ?? null;

            this.variableId = element.payload.variableId;
            this.realEl.addEventListener("input", (evt) => {
                let tempValue;
                if (this.allowedRegex)
                    tempValue = (evt.target.value.match(this.allowedRegex) ?? []).join("");
                else tempValue = evt.target.value;

                if (this.variableId) setVar(this.variableId, tempValue);

                this.realEl.value = tempValue;
            });
            this.realEl.addEventListener("dragstart", (evt) => {
                evt.preventDefault();
            });

            this.willFocus = !!element.payload.autofocus;
        } else if (this.type === "plugin") {
            const tempPlugin = element.payload.use();
            if (tempPlugin === "importing")
                element.payload.promise.then(() => {
                    const tempPlugin = element.payload.use();
                    if (!tempPlugin) return;
                    this.realEl = tempPlugin;
                });
            else if (tempPlugin) this.realEl = tempPlugin;
        } else if (this.type === "image" || this.type === "video") {
            const resource = getAppData().findResourceById(element.payload.resourceId);
            this.realEl = genElement(resource);
        }

        if (this.type === "video" && this.realEl) {
            this.realEl.volume = (element.payload.volume ?? 100) / 100;
            this.realEl.loop = !!element.payload.loop;
            this.realEl.muted = false;
        }

        if (!this.realEl) return;

        if (element.fullscreen) {
            this.realEl.style.width = "var(--gamezone-width)";
            this.realEl.style.height = "var(--gamezone-height)";
        } else {
            this.realEl.style.width = element.width ? `${element.width}px` : "auto";
            this.realEl.style.height = element.height ? `${element.height}px` : "auto";
        }
    }
    render() {
        if (!this.isConnected || !this.realEl) return;
        this.appendChild(this.realEl);
        if (this.willFocus) this.realEl.focus();
        if (this.type === "video") this.realEl.play();
    }
    connectedCallback() {
        this.render();
    }
}

customElements.define("repair-element", RepairElement);
