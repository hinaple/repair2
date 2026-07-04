import { setVar } from "../lib/variables";
import { genElement } from "../lib/resources";
import { subscribe } from "../lib/variables";
import Dragger from "../lib/dragger";
import amplifyVideo from "../lib/amplifyVideo";
import RepairInput from "./repairInput";
import { disposePluginContext } from "../lib/plugin/pluginContext";
import { reportPluginException } from "../lib/plugin/pluginReporter";
import { callFunctionPlugin } from "../lib/plugin/pluginManager";
import { coordToStyleString } from "../lib/coord";
import { getRef } from "../project/refs";
import { goto } from "../project/nodes/output";
import { getEventChannel } from "../project/listener";
import { subscribePluginMount, type PluginMountInfo } from "../lib/plugin/pluginMount";
import type { Types } from "@shared/projectData/types";
import type * as SDK from "@fainthit/repair2-plugin-sdk";

function genEl(element: Types.Element, registerUnsubscriber: (id: string, cb: () => void) => void) {
    if (element.type === "empty") {
        const el = document.createElement("div");
        if (element.payload.content)
            el[element.payload.isHtml ? "innerHTML" : "textContent"] = String(
                element.payload.content
            );

        return el;
    }
    if (element.type === "input") {
        const el = document.createElement(element.payload.isTextarea ? "textarea" : "input");

        el.spellcheck = false;
        if (element.payload.placeholder) el.placeholder = String(element.payload.placeholder);
        if (element.payload.maxLength !== null) el.maxLength = +element.payload.maxLength;

        const valueFunc =
            element.payload.valueFunction &&
            typeof element.payload.valueFunction === "string" &&
            new Function("value", element.payload.valueFunction);

        let allowedRegex: RegExp | null;
        if (!element.payload.allowedType || element.payload.allowedType === "any")
            allowedRegex = null;
        else if (
            element.payload.allowedType === "regex" &&
            typeof element.payload.allowedRegex === "string"
        )
            allowedRegex = new RegExp(element.payload.allowedRegex, "g");
        else
            allowedRegex =
                element.payload.allowedType in regexMap
                    ? regexMap[element.payload.allowedType as keyof typeof regexMap]
                    : null;

        let tempVariableId = element.payload.variableId;
        const variableId =
            tempVariableId && typeof tempVariableId === "string" ? tempVariableId : null;
        if (variableId) {
            const unsub = subscribe(
                variableId,
                (value) => (el.value = typeof value === "string" ? value : "")
            );
            if (unsub) registerUnsubscriber("variable", unsub);
        }
        el.addEventListener("input", () => {
            let tempValue = el.value ?? "";

            if (valueFunc) tempValue = String(valueFunc(tempValue) ?? "");

            if (allowedRegex) tempValue = (tempValue.match(allowedRegex) ?? []).join("");

            if (variableId) setVar(variableId, tempValue);

            el.value = tempValue;
        });
        el.addEventListener("dragstart", (evt) => {
            evt.preventDefault();
        });

        return el;
    } else if (element.type === "image") {
        if (!element.payload.resourceId) return;

        const resource = getRef("resources", element.payload.resourceId);
        if (!resource) return;

        return genElement(resource, !element.payload.removePreload) ?? undefined;
    } else if (element.type === "video") {
        if (!element.payload.resourceId) return;

        const resource = getRef("resources", element.payload.resourceId);
        if (!resource) return;

        const el = genElement(resource, !element.payload.removePreload) as HTMLVideoElement | null;
        if (!el) return;

        el.currentTime = 0;
        const vol = (element.payload.volume ?? 100) / 100;
        if (vol > 1) amplifyVideo(el, vol);
        else el.volume = vol;
        el.loop = !!element.payload.loop;
        el.muted = false;

        return el;
    } else if (element.type === "advancedInput") {
        return new RepairInput(element.payload);
    }
}

const regexMap = {
    english: /[a-z]/gi,
    number: /[0-9]/g,
    korean: /[ㄱ-ㅎ가-힣]/g
} as const;

const InheritKeys = ["width", "height", "childStyle", "fullscreen", "dragOption", "type"] as const;

export default interface RepairElement extends Pick<Types.Element, (typeof InheritKeys)[number]> {
    componentIdentity: SDK.ComponentIdentity;
    elementIdentity: SDK.ElementIdentity;
    element: Types.Element;
    listeners: Types.Listener[];
    realEl?: HTMLElement | RepairInput;
}
export default class RepairElement extends HTMLElement {
    private willFocus: boolean = false;
    private plugin?: PluginMountInfo;
    private dispatch?: (type: string, evt?: any) => void;
    destroyed: boolean = false;
    private rendered: boolean = false;
    private dragger?: Dragger;
    private unsubscribers: Map<string, () => void> = new Map();
    constructor(element: Types.Element, componentIdentity: SDK.ComponentIdentity) {
        super();

        this.type = element.type;
        this.element = element;

        // this.width = element.width;
        // this.height = element.height;
        // this.childStyle = element.childStyle;
        // this.fullscreen = !!element.fullscreen;

        // this.dragOption = element.dragOption;
        InheritKeys.forEach((key) => {
            //@ts-expect-error
            this[key] = element[key];
        });

        this.setAttribute("style", this.styleString);
        if (element.className) this.classList.add(...element.className.split(" "));

        this.componentIdentity = componentIdentity;
        this.elementIdentity = {
            id: element.alias || element.id,
            realId: element.id,
            alias: element.alias ?? null,
            type: element.type
        };

        this.listeners = element.listeners.map((l) => getRef("listeners", l, false));

        if (element.type === "input" && element.payload.autofocus) this.willFocus = true;
        this.realEl = genEl(element, this.registerUnsubscriber);

        const localEvents = this.setListeners();
        if (this.realEl) {
            localEvents.forEach((opt) =>
                this.realEl?.addEventListener(
                    //@ts-expect-error
                    ...opt
                )
            );
        } else if (element.type === "plugin" && element.payload.plugin) {
            const plugin = getRef("pluginPointers", element.payload.plugin);
            if (!plugin) return;

            const listenerMap: Map<string, Set<(evt: any) => void>> = new Map();
            localEvents.forEach(([type, callback]) => {
                let set = listenerMap.get(type);
                if (!set) {
                    set = new Set();
                    listenerMap.set(type, set);
                }
                set.add(callback);
            });

            this.dispatch = (type: string, evt = {}) => {
                const callbackSet = listenerMap.get(type);
                if (!callbackSet) return;
                callbackSet.forEach((c) => c(evt));
            };

            this.registerUnsubscriber(
                "hmr",
                subscribePluginMount({
                    type: "element",
                    name: plugin.name,
                    exportName: plugin.exportName,
                    contextOption: {
                        component: this.componentIdentity,
                        element: this.elementIdentity
                    },
                    payloads: plugin.payloads,
                    beforeMount: () => {
                        if (this.destroyed) return false;
                        if (this.plugin) {
                            this.plugin.unmount?.();
                            disposePluginContext(this.plugin.ctx);
                        }
                        return true;
                    },
                    onMountReady: (plugin) => {
                        this.plugin = plugin;
                        this.rendered = false;
                        this.render();
                    },
                    afterMount: (plugin) => {
                        if (plugin !== this.plugin || this.destroyed) plugin.unmount?.();
                    }
                })
            );
        }
    }
    setListeners() {
        const deadListeners: Set<Types.Listener> = new Set();
        function gotoListener(listener: Types.Listener) {
            if (listener.once) deadListeners.add(listener);
            goto(listener.output);
        }

        const repeating: Map<Types.Listener, { count: number; timeout?: NodeJS.Timeout }> =
            new Map();
        this.registerUnsubscriber("repeat", () => {
            repeating.forEach((rep) => clearTimeout(rep.timeout));
        });

        const activeListener = (listener: Types.Listener) => {
            //when event is activated
            if (listener.repeatCount <= 1) {
                //not repeating event
                gotoListener(listener);
                return;
            }

            const repeatInfo = repeating.get(listener); //repeating info
            if (!repeatInfo) {
                //first activated
                repeating.set(listener, {
                    count: 1,
                    timeout: listener.repeatInterval
                        ? setTimeout(() => repeating.delete(listener), listener.repeatInterval) //reset
                        : undefined //never reset
                });
                return;
            }
            if (repeatInfo.timeout) clearTimeout(repeatInfo.timeout); //remove reset timeout
            repeatInfo.count++;
            if (repeatInfo.count >= listener.repeatCount) {
                gotoListener(listener);
                repeating.delete(listener);
                return;
            }
            if (listener.repeatInterval)
                repeatInfo.timeout = setTimeout(
                    () => repeating.delete(listener),
                    listener.repeatInterval
                );
        };

        type EventData = [string, (evt: any) => void, { capture: boolean }];
        const globalEvents: EventData[] = [];
        this.registerUnsubscriber("globalEvents", () => {
            globalEvents.forEach((opt) => {
                window.removeEventListener(...opt);
            });
        });
        const localEvents: EventData[] = [];
        this.listeners.forEach((l) => {
            if (!l.type) return;
            const eventOpt: EventData = [
                getEventChannel(l),
                async (evt) => {
                    if (deadListeners.has(l)) return;

                    if (
                        l.type === "keyPress" &&
                        l.payload &&
                        typeof l.payload.key === "string" &&
                        l.payload.key.length &&
                        !l.payload.key.split(/\s*,\s*/).includes(evt?.key)
                    )
                        return;
                    else if (l.type === "jsFunction") {
                        try {
                            if (!new Function("event", l.payload.scriptData ?? "")(evt)) return;
                        } catch (e) {
                            console.error("Function listener error:", e);
                            return;
                        }
                    } else if (
                        l.type === "Drag.released" &&
                        l.payload &&
                        typeof l.payload.hotspotIndexes === "string" &&
                        l.payload.hotspotIndexes.trim().length &&
                        (evt?.detail?.hotspotIndex === undefined ||
                            !l.payload.hotspotIndexes
                                .split(",")
                                .map((n) => +n)
                                .includes(evt?.detail?.hotspotIndex))
                    )
                        return;
                    else if (l.type === "plugin" && l.payload.plugin) {
                        const p = getRef("pluginPointers", l.payload.plugin);
                        if (!p) return;
                        try {
                            if (
                                await callFunctionPlugin({
                                    name: p.name,
                                    exportName: p.exportName,
                                    contextOptions: {
                                        component: this.componentIdentity,
                                        element: this.elementIdentity
                                    },
                                    argument: {
                                        channel: l.payload.channel,
                                        event: evt,
                                        attributes: p.payloads
                                    }
                                })
                            )
                                return;
                        } catch (err) {
                            reportPluginException(
                                { id: p.name, type: "function" },
                                "Plugin listener failed.",
                                err,
                                {
                                    type: "plugin-listener-error",
                                    phase: "runtime",
                                    summary: `${p.name} listener failed`
                                }
                            );
                            return;
                        }
                    }

                    activeListener(l);
                },
                { capture: l.useCapture }
            ];

            if (l.global) {
                globalEvents.push(eventOpt);
                window.addEventListener(...eventOpt);
                return;
            }
            if (l.type.startsWith("Drag")) {
                this.addEventListener(...eventOpt);
                return;
            }
            localEvents.push(eventOpt);
        });
        return localEvents;
    }
    getStyleString(absolute: boolean = this.element.absolute, pos: Types.Coord = this.element.pos) {
        if (this.element.fullscreen)
            return (
                "position: absolute;" +
                "width: var(--gamezone-width); height: var(--gamezone-height);" +
                "left: 0; top: 0;" +
                (this.element.style ?? "")
            );
        return (
            (absolute ? `position: absolute;${coordToStyleString(pos)}` : "") +
            (this.element.style ?? "")
        );
    }
    get styleString() {
        return this.getStyleString();
    }
    render() {
        if (this.rendered || !this.isConnected || (!this.plugin && !this.realEl)) return;
        this.rendered = true;

        this.realEl?.setAttribute("style", this.childStyle ?? "");

        if (this.fullscreen) {
            this.style.width = "var(--gamezone-width)";
            this.style.height = "var(--gamezone-height)";
        } else {
            this.style.width = this.width ? `${this.width}px` : "fit-content";
            this.style.height = this.height ? `${this.height}px` : "auto";
        }

        if (!this.dragger && this.dragOption && !this.fullscreen) {
            this.dragger = new Dragger(this.dragOption, this, {
                setPos: (pos) => {
                    this.setAttribute("style", this.getStyleString(true, pos));
                },
                setPosAsDefault: () => {
                    this.setAttribute("style", this.styleString);
                }
            });
            this.registerUnsubscriber("dragger", () => this.dragger?.destroy());
        }

        if (this.type === "plugin") {
            this.renderPlugin();
            return;
        }

        if (!this.realEl) return;

        this.realEl.style.width =
            this.width || this.fullscreen || this.type === "empty" ? "100%" : "auto";
        this.realEl.style.height =
            this.height || this.fullscreen || this.type === "empty" ? "100%" : "auto";

        this.appendChild(this.realEl);
        if (this.willFocus) this.realEl.focus();
        if (this.type === "video") (this.realEl as HTMLVideoElement).play();
    }
    renderPlugin() {
        if (typeof this.plugin?.mount !== "function") return;

        this.replaceChildren();
        this.plugin.mount({ target: this, dispatchEvent: this.dispatch });
    }
    registerUnsubscriber(key: string, unsubscriber: () => void) {
        this.unsubscribers.get(key)?.();
        this.unsubscribers.set(key, unsubscriber);
    }
    connectedCallback() {
        this.render();
    }
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.plugin?.unmount?.();
        if (this.plugin?.ctx) disposePluginContext(this.plugin.ctx);
        if (this.unsubscribers) this.unsubscribers.forEach((unsubscriber) => unsubscriber());
    }
}

customElements.define("repair-element", RepairElement);
