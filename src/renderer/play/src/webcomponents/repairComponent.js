import RepairElement from "./repairElement";
import { disposePluginContext } from "../lib/plugin/pluginContext";
import { subscribePluginMount } from "../lib/plugin/pluginMount";
import { removeComponent } from "../lib/components";
import { reportPluginException } from "../lib/plugin/pluginReporter";
import { getPlugin } from "../lib/plugin/pluginManager";

import Coord from "@renderer/classes/coord";

function getComponentIdentity(componentData) {
    return {
        id: componentData.aliasOrId,
        realId: componentData.id,
        alias: componentData.alias ?? null
    };
}

function getFrameIdentity(framePlugin) {
    return {
        id: framePlugin.name,
        realId: framePlugin.name,
        alias: null
    };
}

export default class RepairComponent extends HTMLElement {
    /**
     * @param {import("@renderer/classes/component.svelte").default} componentData
     * @param {boolean} showIntro
     */
    constructor(componentData, showIntro = true) {
        super();

        this.componentData = componentData;

        this.position = new Coord(componentData.pos.storeData);

        this.visible = componentData.visible;
        this.zIndex = componentData.zIndex ?? 0;
        this.renderStyle(componentData.style ?? "");

        this.componentId = componentData.aliasOrId;
        this.realId = componentData.id;
        this.alias = componentData.alias;

        this.id = this.componentId;

        this.unbreakable = componentData.unbreakable;

        this.showIntro = showIntro;
        this.introTransition = componentData.introTransition;
        this.outroTransition = componentData.outroTransition;

        this.componentIdentity = getComponentIdentity(componentData);
        this.elements = componentData.elements.list.map(
            (e) => new RepairElement(e, this.componentIdentity)
        );

        this.setupFrame();
    }
    setupFrame() {
        const frameData = this.componentData.frame;
        if (!frameData.name) return;

        this.frame = {};
        this.frameIdentity = getFrameIdentity(frameData);
        this.unsubscriber = subscribePluginMount({
            type: "frame",
            name: frameData.name,
            exportName: frameData.exportName,
            contextOption: {
                component: this.componentIdentity,
                frame: this.frameIdentity
            },
            payloads: frameData.payloads,
            beforeMount: () => {
                if (this.destroyed) return false;
                if (typeof this.frame.unmount === "function") this.frame.unmount();
                if (this.frame.ctx) disposePluginContext(this.frame.ctx);
                return true;
            },
            onMountReady: (frame) => {
                this.frame = frame;
                this.rendered = false;
                this.render();
            },
            afterMount: (frame) => {
                if (frame !== this.frame || this.destroyed) frame.unmount?.();
            },
            onMountError: () => {
                this.rendered = false;
                this.render(true);
            }
        });
    }
    makeChildrenFrag() {
        const frag = document.createDocumentFragment();
        frag.append(...this.elements);
        return frag;
    }

    setPositionBy({ x = 0, y = 0 }) {
        if (x) this.position.x.distance = (this.position.x.distance ?? 0) + x;
        if (y) this.position.y.distance = (this.position.y.distance ?? 0) + y;
        this.renderStyle();
    }
    setPosition(coord) {
        ["x", "y"].forEach((axis) => {
            if (!(axis in coord)) return;
            if (typeof coord[axis] === "number" || typeof coord[axis] === "string") {
                this.position[axis].distance = +coord[axis];
                return;
            }
            for (const key in coord[axis]) {
                this.position[axis][key] = coord[axis][key];
            }
        });
        this.renderStyle();
    }
    setVisible(visible) {
        this.visible = visible;
        this.renderStyle();
    }
    setZIndex(zIndex) {
        this.zIndex = zIndex;
        this.renderStyle();
    }
    renderStyle(styleString = null) {
        if (typeof styleString === "string") this.styleString = styleString;
        this.setAttribute(
            "style",
            `position: absolute; ${this.position.styleString} z-index: ${this.zIndex ?? 0}; ` +
                (!this.visible ? "display: none;" : "") +
                (this.styleString ?? "")
        );
    }

    render(ignoreFrame = false) {
        if (this.rendered || !this.isConnected) return;
        this.rendered = true;
        if (!ignoreFrame && typeof this.frame?.mount === "function") {
            const children = this.makeChildrenFrag();
            this.replaceChildren();
            this.frame.mount({ target: this, children, showIntro: !!this.showIntro });
        } else this.append(...this.elements);
    }

    connectedCallback() {
        if (this.destroyed) return;

        if (this.showIntro) this.startTransition(this.introTransition);
        this.render();
        this.showIntro = true;
    }

    /**
     * @param {import("@renderer/classes/transition.svelte").default} transition
     * @param {boolean} isOutro
     * */
    startTransition(transition, isOutro = false) {
        return new Promise(async (res) => {
            try {
                if (!transition.plugin) return res();

                const transitionExport = await getPlugin(
                    "transition",
                    transition.plugin.name,
                    transition.plugin.exportName
                );

                let keyframes = transitionExport;
                if (typeof transitionExport === "function")
                    keyframes = transitionExport({
                        component: this.componentIdentity
                    });
                else if (keyframes && "keyframes" in keyframes) keyframes = keyframes.keyframes;

                if (!keyframes) return res();

                const ani = this.animate(keyframes, {
                    duration: transition.duration,
                    easing: transition.easing,
                    delay: transition.delay,
                    direction: isOutro ? "reverse" : "normal"
                });
                ani.addEventListener("finish", () => {
                    res();
                });
            } catch (err) {
                reportPluginException(
                    { id: transition.plugin?.name, type: "transition" },
                    "Plugin transition failed.",
                    err,
                    {
                        type: "plugin-transition-error",
                        phase: "runtime",
                        summary: `${transition.plugin?.name ?? "Plugin"} transition failed`
                    }
                );
                res();
            }
        });
    }

    disconnectedCallback() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.unsubscriber?.();
        this.frame?.unmount?.();
        if (this.frame?.ctx) disposePluginContext(this.frame.ctx);

        this.elements.forEach((el) => el.destroy());
    }

    createHandle() {
        if (this._handle) return;

        const that = this;
        this._handle = Object.freeze({
            get id() {
                return that.componentId;
            },
            get realId() {
                return that.realId;
            },
            get alias() {
                return that.componentData?.alias ?? null;
            },
            get visible() {
                return !!that.visible;
            },
            get zIndex() {
                return that.zIndex ?? that.componentData.zIndex ?? null;
            },
            get position() {
                return that.position.storeData;
            },
            get destroyed() {
                return that.destroyed;
            },
            get unbreakable() {
                return !!that.unbreakable;
            },
            get hasFrame() {
                return !!that.frame;
            },
            get elementCount() {
                return that.elements?.length ?? 0;
            },
            get node() {
                return that;
            },
            remove(ignoreUnbreakable = false) {
                if (!ignoreUnbreakable && that.unbreakable) return;
                removeComponent(that, false);
            },
            setPosition: (coord) => that.setPosition(coord),
            setPositionBy: (coord) => that.setPositionBy(coord),
            setVisible: (visible) => that.setVisible(visible),
            setZIndex: (zIndex) => that.setZIndex(zIndex),
            setStyle: (newStyle = "") => that.renderStyle(newStyle)
        });
    }
    get handle() {
        if (!this._handle) this.createHandle();
        return this._handle;
    }
}

customElements.define("repair-component", RepairComponent);
