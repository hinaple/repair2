import { genId } from "../../genId";
import type { Types } from "../types";
import { createFactory, owns } from "./factory";
import type { RegisterOwned } from "./factory";
import { createTypePayloadFactory } from "./typePayloadFactory";
import { createValue } from "./value";

const createNodePos = () => ({ x: 0, y: 0 });

export const createEntry = createTypePayloadFactory<Types.Entry>("entry")({
  id: () => genId(),
  alias: null,
  nodePos: createNodePos,
  nodeType: "entry",
  output: null,
  standbyMode: false,
  type: "startup"
});

export const createSequence = createFactory<Types.Sequence>({
  id: () => genId(),
  alias: null,
  nodePos: createNodePos,
  nodeType: "sequence",
  folded: false,
  inputColor: "#000",
  steps: () => [],
  output: null,
  concurrency: "allow"
});

export const createBranch = createFactory<Types.Branch>()({
  id: () => genId(),
  alias: null,
  nodePos: createNodePos,
  nodeType: "branch",
  valueA: owns(createValue),
  valueB: owns(createValue),
  operator: "equals",
  scriptData: null,
  trueOutput: null,
  falseOutput: null,
  disableAfterTrue: false,
  disableAfterFalse: false
});

export const createVariableSet = createFactory<Types.VariableSet>()({
  id: () => genId(),
  alias: null,
  nodePos: createNodePos,
  nodeType: "variableSet",
  folded: false,
  inputColor: "#000",
  variable: null,
  value: owns(createValue),
  output: null
});

export function createNode(
  overrides: Partial<Types.Node> = {},
  registerOwned?: RegisterOwned
): Types.Node {
  if (overrides.nodeType === "entry") return createEntry(overrides, registerOwned!);
  if (overrides.nodeType === "branch") return createBranch(overrides, registerOwned!);
  if (overrides.nodeType === "variableSet") return createVariableSet(overrides, registerOwned!);
  return createSequence(overrides as Partial<Types.Sequence>);
}
