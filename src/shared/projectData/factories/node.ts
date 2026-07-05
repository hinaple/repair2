import { genId } from "../../genId";
import type { Types } from "../types";
import { createFactory } from "./factory";

const createNodePos = () => ({ x: 0, y: 0 });

export const createEntry = createFactory<Types.Entry>(
  {
    id: () => genId(),
    alias: null,
    nodePos: createNodePos,
    nodeType: "entry",
    output: null,
    standbyMode: false,
    type: "startup"
  },
  "entry"
);

export const createSequence = createFactory<Types.Sequence>({
  id: () => genId(),
  alias: null,
  nodePos: createNodePos,
  nodeType: "sequence",
  folded: false,
  inputColor: "#000",
  steps: () => [],
  output: null
});

export const createBranch = createFactory<Types.Branch>({
  id: () => genId(),
  alias: null,
  nodePos: createNodePos,
  nodeType: "branch",
  valueA: "",
  valueB: "",
  operator: "equals",
  scriptData: null,
  trueOutput: null,
  falseOutput: null,
  disableAfterTrue: false,
  disableAfterFalse: false
});

export const createVariableSet = createFactory<Types.VariableSet>({
  id: () => genId(),
  alias: null,
  nodePos: createNodePos,
  nodeType: "variableSet",
  folded: false,
  inputColor: "#000",
  variable: null,
  value: "",
  output: null
});

export function createNode(overrides: Partial<Types.Node> = {}): Types.Node {
  if (overrides.nodeType === "entry") return createEntry(overrides);
  if (overrides.nodeType === "branch") return createBranch(overrides);
  if (overrides.nodeType === "variableSet") return createVariableSet(overrides);
  return createSequence(overrides as Partial<Types.Sequence>);
}
