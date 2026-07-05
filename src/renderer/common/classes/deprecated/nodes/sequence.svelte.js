import Output from "../output";
import AdvancedNode from "./advancedNode";

export default class Sequence extends AdvancedNode {
  steps = $state();
  constructor({ steps = [], output = {}, ...nodeData } = {}, creatingOpt = null) {
    super("sequence", nodeData);
    this.steps = steps;
    this.output = new Output(output, creatingOpt);
  }
  /*
  async execute() {
    for (const step of this.steps.list) {
      if ((await step.execute()) === false) return;
    }
    this.output.goto();
  }
  */

  //#only editor
  get storeData() {
    return {
      ...super.storeData,
      steps: $state.snapshot(this.steps),
      output: this.output
    };
  }
  copyData(availableOuputIds = null) {
    return {
      ...super.copyData(),
      steps: $state.snapshot(this.steps),
      output: this.output.copyData(availableOuputIds)
    };
  }
  // get outputs() {
  //     return [this.output, ...this.steps.outputs];
  // } //need migration
  //#endonly
}
