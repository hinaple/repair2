import { Entry } from "./entry";

export class StandbyEntry extends Entry {
  activated = false;

  enter() {
    if (this.d.standbyMode && !this.activated) return;
    super.enter();
    this.disable();
  }
  execute() {
    this.activate();
  }
  disable() {
    if (!this.d.standbyMode && !this.activated) return;
    this.activated = false;
    this.sendChange("disabled");
  }
  activate() {
    if (!this.d.standbyMode) return;
    this.activated = true;
    this.sendChange("activated");
  }
}
