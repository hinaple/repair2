import { getProject } from "../../project/store";
import type { RecordKey, RecordValue } from "@shared/constants";
import { deepForEach, type ForEachOpt } from "@shared/projectData/relation";

export type ExtractResult = { [K in RecordKey]?: Map<string, RecordValue<K>> };

function addExtractedData<K extends RecordKey>(
  result: ExtractResult,
  type: K,
  id: string,
  data: RecordValue<K>
) {
  const map = (result[type] ??= new Map()) as Map<string, RecordValue<K>>;
  map.set(id, data);
}

export function extractDataFrom<T extends RecordKey>(
  type: T,
  id: string | null,
  opt: ForEachOpt,
  result: ExtractResult = {}
) {
  let source: RecordValue<T>;
  deepForEach(
    getProject(),
    type,
    id,
    ({ type, id, data, level }) => {
      if (level === 0) source = data as RecordValue<T>;
      else addExtractedData(result, type, id, data);
    },
    opt
  );

  return { source: source!, result };
}

// type ExtractFn<T> = (d: T, opt: ExtractOpt, l: number, D: RecursionData) => void;

// const extracts: {
//   [k in Extractable]: ExtractFn<RecordValue<k>>;
// } = {
//   nodes(node, opt, l, D) {
//     if (node.nodeType === "branch") {
//       extractDataFrom("values", node.valueA, opt, l + 1, D);
//       extractDataFrom("values", node.valueB, opt, l + 1, D);
//     } else if (node.nodeType === "variableSet")
//       extractDataFrom("values", node.value, opt, l + 1, D);
//     else if (node.nodeType === "sequence")
//       node.steps.forEach((s) => extractDataFrom("steps", s, opt, l + 1, D));
//   },
//   components(component, opt, l, D) {
//     component.elements.forEach((e) => extractDataFrom("elements", e, opt, l + 1, D));
//     extractDataFrom("pluginPointers", component.frame, opt, l + 1, D);
//     extractDataFrom("pluginPointers", component.introTransition.plugin, opt, l + 1, D);
//     extractDataFrom("pluginPointers", component.introTransition.plugin, opt, l + 1, D);
//   },
//   elements(element, opt, l, D) {
//     element.listeners.forEach((t) => extractDataFrom("listeners", t, opt, l + 1, D));
//     if (element.type === "plugin")
//       extractDataFrom("pluginPointers", element.payload.plugin, opt, l + 1, D);
//   },
//   listeners(listener, opt, l, D) {
//     if (listener.type === "plugin")
//       extractDataFrom("pluginPointers", listener.payload.plugin, opt, l + 1, D);
//   },
//   steps(step, opt, l, D) {
//     if (step.type === "Component.create")
//       extractDataFrom("components", step.payload.componentId, opt, l + 1, D);
//     else if (step.type === "Others.executePlugin")
//       extractDataFrom("pluginPointers", step.payload.plugin, opt, l + 1, D);
//   },
//   values(value, opt, l, D) {
//     value.process.forEach((v) => extractDataFrom("valueProcesses", v, opt, l + 1, D));
//   },
//   pluginPointers: () => {},
//   valueProcesses: () => {}
// };
