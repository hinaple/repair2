import { setVar } from "../lib/variables";
import { genElement } from "../lib/resources";
import { getAppData } from "../lib/appdata";
import { subscribe } from "../lib/variables";
import Dragger from "../lib/dragger";
import amplifyVideo from "../lib/amplifyVideo";
import RepairInput from "./repairInput";
import { disposePluginContext } from "../lib/plugin/pluginContext";
import { reportPluginException } from "../lib/plugin/pluginReporter";
import { subscribePluginMount } from "../lib/plugin/pluginMount";
import { callFunctionPlugin } from "../lib/plugin/pluginManager";

const regexMap = {
    english: /[a-z]/gi,
    number: /[0-9]/g,
    korean: /[ㄱ-ㅎ가-힣]/g
};

export default class RepairElement extends HTMLElement {
    constructor(element, componentIdentity = null) {
        super();

        this.setAttribute("style", element.styleString);

        if (element.className) this.classList.add(...element.className.split(" "));

        this.type = element.types[0];

        this.element = element;
        this.componentIdentity = componentIdentity;
        this.elementIdentity = {
            id: element.alias || element.id,
            realId: element.id,
            alias: element.alias ?? null,
            type: element.types[0]
        };

        this.width = element.width;
        this.height = element.height;
        this.childStyle = element.childStyle;
        this.fullscreen = !!element.fullscreen;

        this.dragOption = element.dragOption;

        this.listeners = element.listeners.list ?? [];

        if (this.type === "empty") {
            this.realEl = document.createElement("div");
            if (element.payload.content)
                this.realEl[element.payload.isHtml ? "innerHTML" : "textContent"] =
                    element.payload.content;
        } else if (this.type === "input") {
            this.realEl = document.createElement(element.payload.isTextarea ? "textarea" : "input");

            this.realEl.spellcheck = false;
            if (element.payload.placeholder) this.realEl.placeholder = element.payload.placeholder;
            if (element.payload.maxLength !== null)
                this.realEl.maxLength = element.payload.maxLength;

            const valueFunc =
                element.payload.valueFunction &&
                new Function("value", element.payload.valueFunction);

            if (!element.payload.allowedType || element.payload.allowedType === "any")
                this.allowedRegex = null;
            else if (element.payload.allowedType === "regex")
                this.allowedRegex = new RegExp(element.payload.allowedRegex, "g");
            else this.allowedRegex = regexMap[element.payload.allowedType] ?? null;

            this.variableId = element.payload.variableId;
            if (this.variableId)
                this.registerUnsubscriber(
                    "variable",
                    subscribe(this.variableId, (value) => (this.realEl.value = value))
                );
            this.realEl.addEventListener("input", () => {
                let tempValue = this.realEl.value ?? "";

                if (valueFunc) tempValue = String(valueFunc(tempValue) ?? "");

                if (this.allowedRegex)
                    tempValue = (tempValue.match(this.allowedRegex) ?? []).join("");

                if (this.variableId) setVar(this.variableId, tempValue);

                this.realEl.value = tempValue;
            });
            this.realEl.addEventListener("dragstart", (evt) => {
                evt.preventDefault();
            });

            this.willFocus = !!element.payload.autofocus;
        } else if (this.type === "image" || this.type === "video") {
            const resource = getAppData().findResourceById(element.payload.resourceId);
            this.realEl = genElement(resource, !element.payload.removePreload);
        } else if (this.type === "advancedInput") {
            this.realEl = new RepairInput(element.payload);
        }

        if (this.type === "video" && this.realEl) {
            this.realEl.currentTime = 0;
            const vol = (element.payload.volume ?? 100) / 100;
            if (vol > 1) amplifyVideo(this.realEl, vol);
            else this.realEl.volume = vol;
            this.realEl.loop = !!element.payload.loop;
            this.realEl.muted = false;
        }

        const localEvents = this.setListeners();
        if (this.realEl) {
            localEvents.forEach((opt) => this.realEl.addEventListener(...opt));
        } else if (this.type === "plugin") {
            const listenerMap = new Map();
            localEvents.forEach(([type, callback]) => {
                let set = listenerMap.get(type);
                if (!set) {
                    set = new Set();
                    listenerMap.set(type, set);
                }
                set.add(callback);
            });

            const dispatchEvent = (type, evt = {}) => {
                const callbackSet = listenerMap.get(type);
                if (!callbackSet) return;
                callbackSet.forEach((c) => c(evt));
            };

            this.pluginSecondParams = { target: this, dispatchEvent };
            this.plugin = {};
            this.registerUnsubscriber(
                "hmr",
                subscribePluginMount({
                    type: "element",
                    name: element.payload.name,
                    exportName: element.payload.exportName,
                    contextOption: {
                        component: this.componentIdentity,
                        element: this.elementIdentity
                    },
                    payloads: element.payload.payloads,
                    beforeMount: () => {
                        if (this.destroyed) return false;
                        if (typeof this.plugin.unmount === "function") this.plugin.unmount();
                        if (this.plugin.ctx) disposePluginContext(this.plugin.ctx);
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
        const deadListeners = [];
        function gotoListener(listener) {
            if (listener.once) deadListeners.push(listener);
            listener.output?.goto();
        }

        this.repeating = new Map();
        const activeListener = (listener) => {
            //when event is activated
            if (listener.repeatCount <= 1) {
                //not repeating event
                gotoListener(listener);
                return;
            }

            const repeatInfo = this.repeating.get(listener); //repeating info
            if (!repeatInfo) {
                //first activated
                this.repeating.set(listener, {
                    count: 1,
                    timeout: listener.repeatInterval
                        ? setTimeout(() => this.repeating.delete(listener), listener.repeatInterval) //reset
                        : null //never reset
                });
                return;
            }
            if (repeatInfo.timeout) clearTimeout(repeatInfo.timeout); //remove reset timeout
            repeatInfo.count++;
            if (repeatInfo.count >= listener.repeatCount) {
                gotoListener(listener);
                this.repeating.delete(listener);
                return;
            }
            if (listener.repeatInterval)
                repeatInfo.timeout = setTimeout(
                    () => this.repeating.delete(listener),
                    listener.repeatInterval
                );
        };

        this.globalEvents = [];
        let localEvents = [];
        this.listeners.forEach((l) => {
            if (!l?.types?.[0]) return;
            const eventOpt = [
                l.realEventChannel,
                async (evt) => {
                    if (deadListeners.includes(l)) return;

                    if (
                        l.types[0] === "keyPress" &&
                        l.payload &&
                        typeof l.payload.key === "string" &&
                        l.payload.key.length &&
                        !l.payload.key.split(/\s*,\s*/).includes(evt?.key)
                    )
                        return;
                    else if (l.types[0] === "jsFunction") {
                        try {
                            if (!new Function("event", l.payload.scriptData)(evt)) return;
                        } catch (e) {
                            console.error("Function listener error:", e);
                            return;
                        }
                    } else if (
                        l.shortType === "Drag.released" &&
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
                    else if (l.types[0] === "plugin" && l.payload && l.payload.plugin?.name) {
                        try {
                            const p = l.payload.plugin;
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
                                { id: l.payload?.name, type: "function" },
                                "Plugin listener failed.",
                                err
                            );
                            return;
                        }
                    }

                    activeListener(l);
                },
                { capture: l.useCapture }
            ];

            if (l.global) {
                this.globalEvents.push(eventOpt);
                window.addEventListener(...eventOpt);
                return;
            }
            if (l.types[0] === "Drag") {
                this.addEventListener(...eventOpt);
                return;
            }
            localEvents.push(eventOpt);
        });
        return localEvents;
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
                    this.setAttribute("style", this.element.getStyleString(true, pos));
                },
                setPosAsDefault: () => {
                    this.setAttribute("style", this.element.styleString);
                }
            });
        }

        if (this.type === "plugin") {
            this.renderPlugin();
            return;
        }

        this.realEl.style.width =
            this.width || this.fullscreen || this.type === "empty" ? "100%" : "auto";
        this.realEl.style.height =
            this.height || this.fullscreen || this.type === "empty" ? "100%" : "auto";

        this.appendChild(this.realEl);
        if (this.willFocus) this.realEl.focus();
        if (this.type === "video") this.realEl.play();
    }
    renderPlugin() {
        if (typeof this.plugin?.mount !== "function") return;

        this.replaceChildren();
        this.plugin.mount(this.pluginSecondParams);
    }
    registerUnsubscriber(key, unsubscriber) {
        if (!this.unsubscribers) this.unsubscribers = {};
        if (this.unsubscribers[key]) this.unsubscribers[key]();
        this.unsubscribers[key] = unsubscriber;
    }
    connectedCallback() {
        this.render();
    }
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        if (typeof this.plugin?.unmount === "function") this.plugin.unmount();
        if (this.plugin?.ctx) disposePluginContext(this.plugin.ctx);
        if (this.unsubscribers)
            Object.values(this.unsubscribers).forEach((unsubscriber) => unsubscriber?.());
        if (this.globalEvents)
            this.globalEvents.forEach((opt) => {
                window.removeEventListener(...opt);
            });
        if (this.dragger) this.dragger.destroy();
        if (this.repeating) this.repeating.forEach((rep) => clearTimeout(rep.timeout));
    }
}

customElements.define("repair-element", RepairElement);
