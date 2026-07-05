import RepairElement from "./repairElement";
import { disposePluginContext } from "../lib/plugin/pluginContext";
import { PluginMountInfo, subscribePluginMount } from "../lib/plugin/pluginMount";
import { compId, removeComponent } from "../lib/components";
import { reportPluginException } from "../lib/plugin/pluginReporter";
import { getPlugin } from "../lib/plugin/pluginManager";
import { coordToStyleString } from "../lib/coord";
import { getRef } from "../project/refs";
import type { Types } from "@shared/projectData/types";
import type SDK from "@fainthit/repair2-plugin-sdk";
type ComponentData = Types.Component;

function getComponentIdentity(componentData: ComponentData): SDK.ComponentIdentity {
  return {
    id: compId(componentData),
    realId: componentData.id,
    alias: componentData.alias ?? null
  };
}

export default interface RepairComponent extends Pick<
  ComponentData,
  "visible" | "zIndex" | "unbreakable"
> {
  componentData: ComponentData;
  position: ComponentData["pos"];
  styleString: string;
  componentId: string;
  realId: string;
  alias: string | null;
  componentIdentity: SDK.ComponentIdentity;
  showIntro: boolean;
  elements: RepairElement[];
  introTransition?: Types.Transition;
  outroTransition?: Types.Transition;
}
export default class RepairComponent extends HTMLElement {
  private frame?: PluginMountInfo;
  private unsubscriber?: () => void;
  destroyed: boolean = false;
  private rendered: boolean = false;
  private _handle?: SDK.ComponentHandle;
  constructor(componentData: ComponentData, showIntro: boolean = true) {
    super();

    this.componentData = componentData;
    this.position = componentData.pos;

    this.visible = componentData.visible;
    this.zIndex = componentData.zIndex ?? 0;
    this.renderStyle(componentData.style ?? "");

    this.componentId = compId(componentData);
    this.realId = componentData.id;
    this.alias = componentData.alias;

    this.id = this.componentId;

    this.unbreakable = componentData.unbreakable;

    this.showIntro = showIntro;
    this.introTransition = componentData.introTransition;
    this.outroTransition = componentData.outroTransition;

    this.componentIdentity = getComponentIdentity(componentData);
    this.elements = [];
    componentData.elements.forEach((e) => {
      const elRef = getRef("elements", e);
      if (elRef) this.elements.push(new RepairElement(elRef, this.componentIdentity));
    });

    this.setupFrame();
  }
  setupFrame() {
    const framePluginId = this.componentData.frame;
    if (!framePluginId) return;

    const frameData = getRef("pluginPointers", framePluginId);
    if (!frameData) return;

    this.unsubscriber = subscribePluginMount({
      type: "frame",
      name: frameData.name,
      exportName: frameData.exportName,
      contextOption: {
        component: this.componentIdentity,
        frame: { id: framePluginId }
      },
      payloads: frameData.payloads,
      beforeMount: () => {
        if (this.destroyed) return false;
        if (this.frame) {
          this.frame.unmount?.();
          disposePluginContext(this.frame.ctx);
        }
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
  setPosition(coord: SDK.ComponentSetPositionOptions) {
    (["x", "y"] as const).forEach((axis) => {
      if (!(axis in coord)) return;
      if (typeof coord[axis] === "number" || typeof coord[axis] === "string") {
        this.position[axis].distance = +coord[axis];
        return;
      }
      this.position[axis] = {
        ...this.position[axis],
        ...coord[axis]
      };
    });
    this.renderStyle();
  }
  setVisible(visible: boolean) {
    this.visible = visible;
    this.renderStyle();
  }
  setZIndex(zIndex: number) {
    this.zIndex = zIndex;
    this.renderStyle();
  }
  renderStyle(styleString: string | null = null) {
    if (typeof styleString === "string") this.styleString = styleString;
    this.setAttribute(
      "style",
      `position: absolute; ${coordToStyleString(this.position)} z-index: ${this.zIndex ?? 0}; ` +
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

    if (this.showIntro && this.introTransition) this.startTransition(this.introTransition);
    this.render();
    this.showIntro = true;
  }

  startTransition(transition: Types.Transition, isOutro = false): Promise<void> {
    return new Promise(async (res) => {
      if (!transition.plugin) return res();
      const plugin = getRef("pluginPointers", transition.plugin);
      if (!plugin) return res();
      try {
        const transitionExport = await getPlugin("transition", plugin.name, plugin.exportName);

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
          { id: plugin.name, type: "transition" },
          "Plugin transition failed.",
          err,
          {
            type: "plugin-transition-error",
            phase: "runtime",
            summary: `${plugin.name}.${plugin.exportName} transition failed`
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
    const obj: SDK.ComponentHandle = {
      id: that.componentId,
      realId: that.realId,
      alias: that.componentData.alias ?? null,
      get visible() {
        return !!that.visible;
      },
      get zIndex() {
        return that.zIndex ?? that.componentData.zIndex ?? null;
      },
      get position() {
        return that.position;
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
      node: that,
      remove(ignoreUnbreakable = false) {
        if (!ignoreUnbreakable && that.unbreakable) return;
        removeComponent(that);
      },
      setPosition: (coord) => that.setPosition(coord),
      setPositionBy: (coord) => that.setPositionBy(coord),
      setVisible: (visible) => that.setVisible(visible),
      setZIndex: (zIndex) => that.setZIndex(zIndex),
      setStyle: (newStyle = "") => that.renderStyle(newStyle)
    };
    this._handle = Object.freeze(obj);
  }
  get handle() {
    if (!this._handle) this.createHandle();
    return this._handle!;
  }
}

customElements.define("repair-component", RepairComponent);
