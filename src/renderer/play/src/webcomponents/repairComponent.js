import RepairElement from "./repairElement";

export default class RepairComponent extends HTMLElement {
    constructor(componentData, showIntro = true) {
        super();

        this.renderStyle(componentData.styleString || "");

        this.componentId = componentData.aliasOrId;
        this.realId = componentData.id;

        this.id = this.componentId;

        this.visible = componentData.visible;
        this.unbreakable = componentData.unbreakable;

        this.showIntro = showIntro;
        this.introTransition = componentData.introTransition;
        this.outroTransition = componentData.outroTransition;

        this.frameEl = null;
        this.unsubscriber = componentData.frame.hmrSubscribe((tempFrame) => {
            if (!tempFrame) return;
            const prvFrame = this.frameEl;
            this.frameEl = tempFrame;
            this.appendChild(this.frameEl);

            if (!this.isConnected) return;
            this.render();
            if (prvFrame) this.removeChild(prvFrame);
        });

        this.elements = componentData.elements.list.map((e) => new RepairElement(e));
    }

    setZIndex(zIndex) {
        this.zIndex = zIndex;
        this.renderStyle();
    }
    renderStyle(styleString = this.styleString) {
        this.styleString = styleString;
        this.setAttribute(
            "style",
            `position: absolute; ${this.styleString}` +
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
            if (!transition.plugin) res();

            let keyframes = await transition.plugin.use();
            if (!keyframes) res();

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
        });
    }

    disconnectedCallback() {
        this.unsubscriber?.();
    }
}

window.customElements.define("repair-component", RepairComponent);
