import RepairElement from "./repairElement";
import { disposePluginContext } from "../lib/plugin/pluginContext";
import { reportPluginException } from "../lib/plugin/pluginReporter";
import { pluginAppended } from "../lib/plugin/pluginStyles";
import { subscribePluginMount } from "../lib/plugin/pluginMount";

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
    constructor(componentData, showIntro = true) {
        super();

        this.componentData = componentData;

        this.renderStyle(componentData.style ?? "");

        this.componentId = componentData.aliasOrId;
        this.realId = componentData.id;

        this.id = this.componentId;

        this.visible = componentData.visible;
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

    setVisible(visible) {
        this.visible = visible;
        this.renderStyle();
    }
    setZIndex(zIndex) {
        this.zIndex = zIndex;
        this.renderStyle();
    }
    renderStyle(styleString = this.componentData.styleString) {
        this.styleString = styleString;
        this.setAttribute(
            "style",
            `position: absolute; ${this.componentData.styleString} ${this.styleString}` +
                (this.zIndex ? `z-index: ${this.zIndex};` : "") +
                (!this.visible ? "display: none;" : "")
        );
    }

    render(ignoreFrame = false) {
        if (this.rendered || !this.isConnected) return;
        this.rendered = true;
        if (!ignoreFrame && typeof this.frame?.mount === "function") {
            pluginAppended("frame", this.componentData.frame.name);
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

    startTransition(transition, isOutro = false) {
        return new Promise(async (res) => {
            try {
                if (!transition.plugin) return res();

                let keyframes = await transition.plugin.use(null, {
                    component: this.componentIdentity
                });
                if (!keyframes) return res();

                if (typeof keyframes === "function") keyframes = keyframes();

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
                    err
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
}

customElements.define("repair-component", RepairComponent);
