import {
  createBranch,
  createComponent,
  createElement,
  createPluginPointer,
  createStep,
  createTransition,
  createVariableSet
} from "@shared/projectData/factories";
import { createRecordFactory } from "@shared/projectData/factories/factory";
import type { RegisterOwned } from "@shared/projectData/factories/factory";

declare const registerOwned: RegisterOwned;

// @ts-expect-error A record factory must match the value type of its record key.
createRecordFactory("components", createPluginPointer);

createTransition({ plugin: "existing-plugin" });
createTransition(undefined, registerOwned);
// @ts-expect-error An owned plugin must be registered when its ID is not overridden.
createTransition();
// @ts-expect-error An empty override still needs an owned plugin.
createTransition({});

createComponent({
  frame: "frame-plugin",
  introTransition: { plugin: "intro-plugin" },
  outroTransition: { plugin: "outro-plugin" }
});
createComponent(undefined, registerOwned);
// @ts-expect-error Both nested transitions create owned plugin pointers by default.
createComponent();

createBranch({ valueA: "value-a", valueB: "value-b" });
createBranch(undefined, registerOwned);
// @ts-expect-error Both branch values are owned and must be registered when absent.
createBranch();

createVariableSet({ value: "value-1" });
createVariableSet(undefined, registerOwned);
// @ts-expect-error A variable-set value must be registered when absent.
createVariableSet();

createStep();
createStep({
  type: "Component.create",
  payload: { componentId: "existing-component", recreate: "allow" }
});
createStep({ type: "Component.create" }, registerOwned);
// @ts-expect-error Component.create requires registration when componentId is missing.
createStep({ type: "Component.create" });

createElement({
  type: "plugin",
  payload: { plugin: "existing-plugin" }
});
createElement({ type: "plugin" }, registerOwned);
// @ts-expect-error A plugin element requires registration when plugin is missing.
createElement({ type: "plugin" });
