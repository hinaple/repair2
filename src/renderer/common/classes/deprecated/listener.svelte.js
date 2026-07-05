import { genId } from "@shared/genId";
import PluginPointer from "./pluginPointer.svelte";
import TypePayload from "./typePayload.svelte";

// class PluginListener {
//     constructor({ channel = null, plugin = {} } = {}) {
//         this.channel = channel;
//         this.plugin = new PluginPointer(plugin, "function");
//     }
//     //#only editor
//     get storeData() {
//         return { channel: this.channel, plugin: this.plugin.storeData };
//     }
//     //#endonly
// } //need migration

const TypeMap = {
  keyPress: "keydown",
  globalKeyPress: "keydown",
  videoEnd: "ended",
  "Mouse.click": "click",
  "Mouse.down": "pointerdown",
  "Mouse.up": "pointerup",
  "Drag.released": "dragreleased",
  "Drag.return": "dragreturn"
};

export default class Listener extends TypePayload {
  repeatCount = $state();
  repeatInterval = $state();
  once = $state();
  global = $state();
  useCapture = $state();
  output = $state();
  constructor(
    {
      id = genId(),
      type = "custom",
      payload = {},
      output = null,
      once = false,
      repeatCount = 1,
      repeatInterval = 0,
      global = false,
      useCapture = false
    } = {},
    creatingOpt = null //need migration for all the creatingOpt
  ) {
    if (type === "click") type = "Mouse.click";
    else if (type === "released") type = "Drag.released";
    else if (type === "globalKeyPress") {
      type = "keyPress";
      global = true;
      useCapture = payload.useCapture ?? false;
    }
    super("listener", { type, payload });
    this.id = id;
    this.output = output;
    this.repeatCount = repeatCount;
    this.repeatInterval = repeatInterval;
    this.once = once;
    this.global = global;
    this.useCapture = useCapture;
  }

  //#only play
  get realEventChannel() {
    return this.payload.channel?.length
      ? this.payload.channel
      : (TypeMap[this.shortType] ?? this.lastType);
  }
  //#endonly

  //#only editor
  get storeData() {
    return {
      ...super.storeData,
      id: this.id,
      output: this.output,
      repeatCount: this.repeatCount,
      repeatInterval: this.repeatInterval,
      once: this.once,
      global: this.global,
      useCapture: this.useCapture
    };
  }
  copyData(availableOuputIds = null) {
    return {
      ...super.storeData,
      id: this.id,
      repeatCount: this.repeatCount,
      repeatInterval: this.repeatInterval,
      once: this.once,
      global: this.global,
      useCapture: this.useCapture,
      output: this.output
    };
  }
  //#endonly
}
