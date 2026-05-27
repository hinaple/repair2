import amplifyVideo from "../lib/amplifyVideo";
import { genElement, getResourceByTitle } from "../lib/resources";

export default class RepairAsset extends HTMLElement {
    static observedAttributes = ["title", "clone", "notpreload", "volume", "loop"];

    constructor() {
        super();
        RepairAsset.observedAttributes.forEach((attr) => (this[attr] = this.getAttribute(attr)));
    }
    setResourceElement() {
        const prevResourceElement = this.resourceElement;
        this.resource = getResourceByTitle(this.title);
        if (!this.resource) {
            this.resourceElement = null;
            delete this.amplifier;
            return;
        }
        this.resourceElement = genElement(
            this.resource,
            this.isTrueAttr(this.clone),
            this.isTrueAttr(this.notpreload)
        );
        if (prevResourceElement !== this.resourceElement) delete this.amplifier;
    }
    attributeChangedCallback(attr, oldVal, newVal) {
        this[attr] = newVal;
        if (!this.isConnected) return;
        if (attr === "title" && oldVal?.trim?.() !== newVal?.trim?.()) {
            this.setResourceElement();
            this.render();
        }
        if (attr === "volume" || attr === "loop") {
            this.applyVideo();
        }
    }
    render() {
        if (!this.isConnected) return;

        this.replaceChildren(...(this.resourceElement ? [this.resourceElement] : []));
        if (this.resourceElement && this.resource.fileType === "video") {
            this.resourceElement.currentTime = 0;
            this.resourceElement.muted = false;
            this.applyVideo();
        }
    }
    applyVideo() {
        if (!this.resourceElement || this.resource.fileType !== "video") return;

        const vol = +(this.volume ?? 100) / 100;
        if (this.amplifier) this.amplifier.amplify(vol);
        else if (vol > 1) this.amplifier = amplifyVideo(this.resourceElement, vol);
        else this.resourceElement.volume = vol;
        this.resourceElement.loop = this.isTrueAttr(this.loop);
    }
    isTrueAttr(value) {
        return typeof value === "string" && value !== "false";
    }
    connectedCallback() {
        this.setResourceElement();
        this.render();
    }
}

customElements.define("repair-asset", RepairAsset);
