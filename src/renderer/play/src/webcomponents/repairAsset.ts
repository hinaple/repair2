import { genElement, getResourceByTitle } from "../lib/resources";
import amplifyVideo, { type Amplifier } from "../lib/amplifyVideo";
import type { Resource } from "../project/resource";

export default class RepairAsset extends HTMLElement {
  static observedAttributes = ["src", "clone", "notpreload", "volume", "loop"];

  private _attr: Record<string, any> = {};
  private resource?: Resource | null;
  private resourceElement?: HTMLVideoElement | HTMLImageElement | null;
  private amplifier?: Amplifier;

  constructor() {
    super();
    RepairAsset.observedAttributes.forEach((attr) => this.attr(attr, this.getAttribute(attr)));
  }
  setResourceElement() {
    const prevResourceElement = this.resourceElement;
    this.resource = getResourceByTitle(this.attr("src"));
    if (!this.resource) {
      this.resourceElement = null;
      delete this.amplifier;
      return;
    }
    this.resourceElement = genElement(
      this.resource,
      this.isTrueAttr(this.attr("clone")),
      this.isTrueAttr(this.attr("notpreload"))
    );
    if (prevResourceElement !== this.resourceElement) delete this.amplifier;
  }
  attributeChangedCallback(attr: string, oldVal: string | null, newVal: string | null) {
    this.attr(attr, newVal);
    if (!this.isConnected) return;
    if (attr === "src" && oldVal?.trim?.() !== newVal?.trim?.()) {
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
    if (this.resourceElement instanceof HTMLVideoElement) {
      this.resourceElement.currentTime = 0;
      this.resourceElement.muted = false;
      this.applyVideo();
    }
  }
  applyVideo() {
    if (!(this.resourceElement instanceof HTMLVideoElement)) return;

    const vol = +(this.attr("volume") ?? 1);
    if (this.amplifier) this.amplifier.amplify(vol);
    else if (vol > 1) this.amplifier = amplifyVideo(this.resourceElement, vol);
    else this.resourceElement.volume = vol;
    this.resourceElement.loop = this.isTrueAttr(this.attr("loop"));
  }
  isTrueAttr(value: string) {
    return typeof value === "string" && value !== "false";
  }
  attr(param0: string, param1?: string | null) {
    if (typeof param1 !== "undefined") this._attr[param0] = param1;
    else return this._attr[param0];
  }
  connectedCallback() {
    this.setResourceElement();
    this.render();
  }
}

customElements.define("repair-asset", RepairAsset);
