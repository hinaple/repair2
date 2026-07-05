import Coord from "./coord";
import TypePayload from "./typePayload.svelte";
import PluginPointer from "./pluginPointer.svelte";
import { genId } from "@shared/genId";
import DragOption from "./dragOption.svelte";

export default class Element extends TypePayload {
  alias = $state();
  fullscreen = $state();
  width = $state();
  height = $state();
  style = $state();
  childStyle = $state();
  className = $state();
  absolute = $state();
  listeners = $state();
  constructor(
    {
      id = genId(),
      alias = null,
      type = "empty",
      payload = {},
      absolute = false,
      pos = {},
      width = null,
      height = null,
      style = null,
      childStyle = null,
      className = null,
      fullscreen = false,
      listeners = [],
      dragOption = {}
    } = {},
    creatingOpt = null
  ) {
    super("element", { type, payload });
    this.id = id;
    this.alias = alias;
    this.pos = new Coord(pos);
    this.absolute = absolute;
    this.fullscreen = fullscreen;
    this.width = width;
    this.height = height;
    this.style = style;
    this.childStyle = childStyle;
    this.className = className;
    this.listeners = listeners;
    this.dragOption = new DragOption(dragOption);
  }
  //#only play
  getStyleString(absolute, pos) {
    if (this.fullscreen)
      return (
        "position: absolute;" +
        "width: var(--gamezone-width); height: var(--gamezone-height);" +
        "left: 0; top: 0;" +
        (this.style ?? "")
      );
    return (absolute ? `position: absolute;${pos.styleString}` : "") + (this.style ?? "");
  }
  get styleString() {
    return this.getStyleString(this.absolute, this.pos);
  }
  //#endonly
  //#only editor
  get storeData() {
    return {
      ...super.storeData,
      id: this.id,
      alias: this.alias,
      width: this.width,
      height: this.height,
      style: this.style,
      childStyle: this.childStyle,
      className: this.className,
      pos: this.pos.storeData,
      absolute: this.absolute,
      fullscreen: this.fullscreen,
      listeners: $state.snapshot(this.listeners),
      dragOption: this.dragOption.storeData
    };
  }
  copyData(availableOuputIds = null) {
    return {
      ...super.copyData(availableOuputIds),
      alias: this.alias,
      width: this.width,
      height: this.height,
      style: this.style,
      childStyle: this.childStyle,
      className: this.className,
      pos: this.pos.storeData,
      absolute: this.absolute,
      fullscreen: this.fullscreen,
      listeners: $state.snapshot(this.listeners),
      dragOption: this.dragOption.storeData
    };
  }
  // get outputs() {
  //     return this.listeners.outputs;
  // } //need migration
  //#endonly
}
