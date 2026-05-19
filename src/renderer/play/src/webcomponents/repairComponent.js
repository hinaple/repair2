import RepairElement from "./repairElement";
import { disposePluginContext } from "../lib/pluginContext";
import { reportPluginException } from "../lib/pluginReporter";

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

        this.frameEl = null;
        this.componentIdentity = getComponentIdentity(componentData);
        this.frameIdentity = getFrameIdentity(componentData.frame);
        this.unsubscriber = componentData.frame.hmrSubscribe(
            (tempFrame) => {
                if (!tempFrame) return;
                const prvFrame = this.frameEl;
                this.frameEl = tempFrame;
                this.appendChild(this.frameEl);

                if (!this.isConnected) return;
                this.render();
                if (prvFrame) {
                    disposePluginContext(prvFrame.__repairPluginContext);
                    this.removeChild(prvFrame);
                }
            },
            {
                component: this.componentIdentity,
                frame: this.frameIdentity
            }
        );

        this.elements = componentData.elements.list.map(
            (e) => new RepairElement(e, this.componentIdentity)
        );
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
                (this.zIndex ? `z-index: ${this.zIndex};` : "")
        );
    }

    render() {
        this.elements.forEach((el) => (this.frameEl ?? this).appendChild(el));
    }

    connectedCallback() {
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
                    { id: transition.plugin?.name, type: "transitions" },
                    "Plugin transition failed.",
                    err
                );
                res();
            }
        });
    }

    disconnectedCallback() {
        this.elements.forEach((el) => el.destroy());
        disposePluginContext(this.frameEl?.__repairPluginContext);
        this.unsubscriber?.();
    }
}

window.customElements.define("repair-component", RepairComponent);
