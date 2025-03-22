import { setVar } from "../lib/variables";
import { genElement } from "../lib/resources";
import { getAppData } from "../lib/appdata";
import { packageLoader } from "../lib/plugin-package-loader.js";
import { subscribe } from "../lib/variables";

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
            if (element.payload.maxLength !== null)
                this.realEl.maxlength = element.payload.maxLength;

            if (!element.payload.allowedType || element.payload.allowedType === "any")
                this.allowedRegex = null;
            else if (element.payload.allowedType === "regex")
                this.allowedRegex = new RegExp(element.payload.allowedRegex, "g");
            else this.allowedRegex = regexMap[element.payload.allowedType] ?? null;
            if (element.payload.maxLength) this.realEl.maxLength = element.payload.maxLength;

            this.variableId = element.payload.variableId;
            if (this.variableId)
                this.unsubscribe = subscribe(
                    this.variableId,
                    (value) => (this.realEl.value = value)
                );
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
            element.payload.use(packageLoader).then((tempPlugin) => {
                if (!tempPlugin) return;
                this.realEl = tempPlugin;
                this.render();
            });
        } else if (this.type === "image" || this.type === "video") {
            const resource = getAppData().findResourceById(element.payload.resourceId);
            this.realEl = genElement(resource, !element.payload.removePreload);
        }

        if (this.type === "video" && this.realEl) {
            this.realEl.volume = (element.payload.volume ?? 100) / 100;
            this.realEl.loop = !!element.payload.loop;
            this.realEl.muted = false;
        }

        if (!this.realEl) return;

        this.realEl.setAttribute("style", element.childStyle ?? "");

        if (element.fullscreen) {
            this.realEl.style.width = "var(--gamezone-width)";
            this.realEl.style.height = "var(--gamezone-height)";
        } else {
            this.realEl.style.width = element.width ? `${element.width}px` : "auto";
            this.realEl.style.height = element.height ? `${element.height}px` : "auto";
        }

        const deadListenerIdx = [];
        (element.listeners.list ?? []).forEach((l, idx) => {
            this.realEl.addEventListener(l.realEventChannel, async (evt) => {
                if (deadListenerIdx.includes(idx)) return;

                if (
                    l.types[0] === "keyPress" &&
                    l.payload.key?.length &&
                    !l.payload.key.split(/\s*,\s*/).includes(evt.key)
                )
                    return;
                else if (l.types[0] === "jsFunction") {
                    try {
                        if (!new Function("event", l.payload.scriptData)(evt)) return;
                    } catch (e) {
                        return;
                    }
                } else if (l.types[0] === "plugin") {
                    if (await l.payload.use(packageLoader).then((func) => func?.({ event: evt })))
                        return;
                }

                if (l.once) deadListenerIdx.push(idx);
                l.output.goto();
            });
        });
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
    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }
}

customElements.define("repair-element", RepairElement);
