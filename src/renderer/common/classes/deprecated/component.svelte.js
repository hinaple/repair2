import { genId } from "@shared/genId";
import Coord from "./coord";
import PluginPointer from "./pluginPointer.svelte";
import Transition from "./transition.svelte";

export default class Component {
  alias = $state();
  zIndex = $state();
  visible = $state();
  unbreakable = $state();
  style = $state();
  elements = $state();
  constructor(
    {
      id = genId(),
      alias = null,
      elements = [],
      pos = {},
      zIndex = null,
      unbreakable = false,
      visible = true,
      style = null,
      frame = {},
      introTransition = {},
      outroTransition = {}
    } = {},
    creatingOpt = null
  ) {
    this.id = id;
    this.alias = alias;
    this.elements = elements;
    this.pos = new Coord(pos);
    this.zIndex = zIndex;
    this.unbreakable = unbreakable;
    this.visible = visible;
    this.style = style;
    this.frame = new PluginPointer(frame, "frame");
    this.introTransition = new Transition(introTransition);
    this.outroTransition = new Transition(outroTransition);
  }

  //#only play
  get styleString() {
    return `${this.pos.styleString} z-index: ${this.zIndex ?? 0};`;
  }
  get aliasOrId() {
    return this.alias || this.id;
  }
  //#endonly

  //#only editor
  get storeData() {
    return {
      id: this.id,
      alias: this.alias,
      zIndex: this.zIndex,
      pos: this.pos.storeData,
      unbreakable: this.unbreakable,
      visible: this.visible,
      style: this.style,
      elements: $state.snapshot(this.elements),
      frame: this.frame.storeData,
      introTransition: this.introTransition.storeData,
      outroTransition: this.outroTransition.storeData
    };
  }
  copyData(availableOuputIds = null) {
    return {
      alias: this.alias,
      zIndex: this.zIndex,
      pos: this.pos.storeData,
      unbreakable: this.unbreakable,
      visible: this.visible,
      style: this.style,
      elements: $state.snapshot(this.elements),
      frame: this.frame.storeData,
      introTransition: this.introTransition.storeData,
      outroTransition: this.outroTransition.storeData
    };
  }
  get outputs() {
    return this.elements.outputs;
  }
  //#endonly
}
