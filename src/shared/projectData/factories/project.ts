import type { Types } from "../types";
import { createConfig } from "./config";
import { createComponent } from "./component";
import { createElement } from "./element";
import { createFactory, nested, recordOf } from "./factory";
import { createListener } from "./listener";
import { createNode } from "./node";
import { createPluginPointer } from "./pluginPointer";
import { createResource } from "./resource";
import { createStep } from "./step";
import { createValue } from "./value";
import { createValueProcess } from "./valueProcess";
import { createVariable } from "./variable";

declare const __APP_VERSION__: string;

export const createProject = createFactory<Types.Data>({
  version: 2,
  appVersion: () => __APP_VERSION__,
  config: nested(createConfig),
  resources: recordOf(createResource, "id"),
  variables: recordOf(createVariable, "id"),
  nodes: recordOf<Types.Node, "id">(createNode, "id"),
  steps: recordOf(createStep, "id"),
  components: recordOf(createComponent, "id"),
  elements: recordOf(createElement, "id"),
  listeners: recordOf(createListener, "id"),
  valueProcesses: recordOf(createValueProcess, "id"),
  pluginPointers: recordOf(createPluginPointer),
  values: recordOf(createValue),
  updatedAt: () => Date.now()
});
