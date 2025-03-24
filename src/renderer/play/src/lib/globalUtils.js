import { LitElement, html, css } from "lit";

globalThis.LitElement = LitElement;
globalThis.html = html;
globalThis.css = css;

globalThis.RepairUtils = {};

export function registerUtils(key, obj) {
    globalThis.RepairUtils[key] = obj;
}
