import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type * as V1 from "@shared/projectData/v1Data.types";
import type * as V2 from "@shared/projectData/v2Data.types";
import { migrateToV2 } from "../../project/migrate/v2";
import realV1ProjectData from "./v1Data.json";

type AnyRecord = Record<string, any>;

const TEST_APP_VERSION = "v2-migration-test";

function asRecord(value: unknown): AnyRecord {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  return value as AnyRecord;
}

function assertString(value: unknown, message?: string): asserts value is string {
  assert.equal(typeof value, "string", message);
}

function values<T = AnyRecord>(record: Record<string, T>) {
  return Object.values(record);
}

function assertOutputResolved(output: unknown) {
  assert.ok(output === null || typeof output === "string");
}

function assertNoInlineOutputs(project: V2.Data) {
  values(project.nodes).forEach((node) => {
    if ("output" in node) assertOutputResolved(node.output);
    if ("trueOutput" in node) assertOutputResolved(node.trueOutput);
    if ("falseOutput" in node) assertOutputResolved(node.falseOutput);
  });

  values(project.listeners).forEach((listener) => assertOutputResolved(listener.output));
}

function assertNoEmptyPluginPointers(project: V2.Data) {
  values(project.pluginPointers).forEach((pointer) => {
    assertString(pointer.name);
    assert.ok(pointer.name.length > 0);
  });
}

function assertComponentGraphIsFlattened(project: V2.Data) {
  values(project.steps).forEach((step) => {
    if (step.type !== "Component.create") return;

    const componentId = step.payload.componentId;
    assertString(componentId);
    assert.ok(project.components[componentId], `missing component ${componentId}`);
    assert.ok(!("elements" in step.payload), "Component.create payload still has inline elements");
  });

  values(project.components).forEach((component) => {
    assert.ok(Array.isArray(component.elements));
    component.elements.forEach((elementId) => {
      assert.equal(typeof elementId, "string");
      assert.ok(project.elements[elementId], `missing element ${elementId}`);
    });
  });

  values(project.elements).forEach((element) => {
    assert.ok(Array.isArray(element.listeners));
    element.listeners.forEach((listenerId) => {
      assert.equal(typeof listenerId, "string");
      assert.ok(project.listeners[listenerId], `missing listener ${listenerId}`);
    });
  });
}

function assertValueGraphIsFlattened(project: V2.Data) {
  values(project.nodes).forEach((node) => {
    if (node.type === "branch") {
      assert.equal(typeof node.valueA, "string");
      assert.equal(typeof node.valueB, "string");
      assert.ok(project.values[node.valueA], `missing value ${node.valueA}`);
      assert.ok(project.values[node.valueB], `missing value ${node.valueB}`);
    }
    if (node.type === "variableSet") {
      assert.equal(typeof node.value, "string");
      assert.ok(project.values[node.value], `missing value ${node.value}`);
    }
  });

  values(project.values).forEach((value) => {
    assert.ok(Array.isArray(value.process));
    value.process.forEach((processId) => {
      assert.equal(typeof processId, "string");
      assert.ok(project.valueProcesses[processId], `missing value process ${processId}`);
      assert.equal(project.valueProcesses[processId].id, processId);
    });
  });
}

function findStep(project: V2.Data, type: string) {
  return values(project.steps).find((step) => step.type === type);
}

function findElement(project: V2.Data, type: string) {
  return values(project.elements).find((element) => element.type === type);
}

function findListener(project: V2.Data, type: string) {
  return values(project.listeners).find((listener) => listener.type === type);
}

function makeSyntheticV1Project(): V1.Data {
  return {
    VERSION: "2.5.1-next.synthetic",
    config: {
      title: "Synthetic migration fixture",
      width: 800,
      height: 600,
      runtimePlugins: [
        { name: "runtime-plugin", exportName: "default", payloads: { mode: "test" } },
        { name: null, exportName: "default", payloads: {} }
      ]
    },
    resources: [{ id: "res-image", src: "image.png", alias: null }],
    variables: [{ id: "var-name", name: "name", defaultValue: "Alice" }],
    nodes: [
      {
        type: "entry",
        id: "entry-start",
        alias: null,
        nodePos: { x: 0, y: 0 },
        entryType: ["startup"],
        payload: {},
        output: { to: "seq-main" }
      },
      {
        type: "sequence",
        id: "seq-main",
        alias: null,
        folded: false,
        inputColor: "#000",
        nodePos: { x: 200, y: 0 },
        output: { to: "branch-main" },
        steps: [
          {
            id: "step-create",
            title: null,
            type: ["Component", "create"],
            payload: {
              id: "component-main",
              alias: "main",
              zIndex: 3,
              pos: {},
              unbreakable: false,
              visible: true,
              style: null,
              frame: {
                name: "frame-plugin",
                exportName: "default",
                payloads: { chrome: "thin" }
              },
              introTransition: {
                duration: 100,
                delay: 10,
                easing: "linear",
                plugin: {
                  name: "transition-plugin",
                  exportName: "intro",
                  payloads: {}
                }
              },
              outroTransition: {
                duration: 200,
                delay: 20,
                easing: "ease-in",
                plugin: {
                  name: null,
                  exportName: "default",
                  payloads: {}
                }
              },
              elements: [
                {
                  id: "element-plugin",
                  type: ["plugin"],
                  payload: {
                    name: "element-plugin",
                    exportName: "default",
                    payloads: { text: "hello" }
                  },
                  alias: null,
                  width: null,
                  height: null,
                  style: null,
                  childStyle: null,
                  className: null,
                  pos: {},
                  absolute: false,
                  fullscreen: false,
                  dragOption: {},
                  listeners: [
                    {
                      type: ["plugin"],
                      payload: {
                        channel: "done",
                        plugin: {
                          name: "listener-plugin",
                          exportName: "default",
                          payloads: {}
                        }
                      },
                      output: { to: "var-set" },
                      repeatCount: 1,
                      repeatInterval: 0,
                      once: false,
                      global: false,
                      useCapture: false
                    },
                    {
                      type: ["custom"],
                      payload: { channel: "ignored" },
                      output: { to: null },
                      repeatCount: 1,
                      repeatInterval: 0,
                      once: false,
                      global: false,
                      useCapture: false
                    }
                  ]
                },
                {
                  id: "element-image",
                  type: ["image"],
                  payload: { resourceId: "res-image", removePreload: true },
                  alias: null,
                  width: 100,
                  height: null,
                  style: null,
                  childStyle: null,
                  className: null,
                  pos: {},
                  absolute: false,
                  fullscreen: false,
                  dragOption: {},
                  listeners: []
                }
              ]
            }
          },
          {
            id: "step-execute-plugin",
            title: null,
            type: ["Others", "executePlugin"],
            payload: {
              plugin: {
                name: "function-plugin",
                exportName: "default",
                payloads: { action: "run" }
              },
              waitTillEnd: true
            }
          },
          {
            id: "step-log",
            title: "log",
            type: ["Others", "log"],
            payload: { content: "done" }
          }
        ]
      },
      {
        type: "branch",
        id: "branch-main",
        alias: null,
        nodePos: { x: 400, y: 0 },
        trueOutput: { to: "var-set" },
        falseOutput: { to: null },
        operator: "equals",
        scriptData: null,
        disableAfterTrue: false,
        disableAfterFalse: false,
        valueA: {
          baseType: "variable",
          baseValue: "var-name",
          process: [
            { type: ["trim"], payload: null },
            { type: ["toLowerCase"], payload: null }
          ]
        },
        valueB: {
          baseType: "string",
          baseValue: "alice",
          process: []
        }
      },
      {
        type: "variableSet",
        id: "var-set",
        alias: null,
        folded: false,
        inputColor: "#000",
        nodePos: { x: 600, y: 0 },
        value: {
          baseType: "string",
          baseValue: "complete",
          process: [{ type: ["replaceAll"], payload: { from: "complete", to: "done" } }]
        },
        variableId: "var-name",
        output: { to: null }
      }
    ],
    updatedAt: 1
  } as unknown as V1.Data;
}

function assertSyntheticMigration(project: V2.Data) {
  assert.deepEqual(Object.keys(project.resources), ["res-image"]);
  assert.deepEqual(Object.keys(project.variables), ["var-name"]);
  assert.equal(project.config.title, "Synthetic migration fixture");
  assert.deepEqual(project.config.runtimePlugins, [project.config.runtimePlugins?.[0]]);
  assert.equal(project.config.runtimePlugins?.length, 1);

  const runtimePluginId = project.config.runtimePlugins?.[0];
  assert.equal(project.pluginPointers[runtimePluginId!].name, "runtime-plugin");

  const entry = project.nodes["entry-start"] as AnyRecord;
  assert.equal(entry.entryType, "startup");
  assert.equal(entry.output, "seq-main");

  const seq = project.nodes["seq-main"] as AnyRecord;
  assert.deepEqual(seq.steps, ["step-create", "step-execute-plugin", "step-log"]);
  assert.equal(seq.output, "branch-main");

  const createStep = project.steps["step-create"] as AnyRecord;
  assert.equal(createStep.type, "Component.create");
  assert.equal(createStep.payload.componentId, "component-main");

  const executeStep = project.steps["step-execute-plugin"] as AnyRecord;
  assert.equal(executeStep.type, "Others.executePlugin");
  assert.equal(executeStep.payload.waitTillEnd, true);
  assert.equal(project.pluginPointers[executeStep.payload.plugin].name, "function-plugin");

  const component = project.components["component-main"];
  assert.deepEqual(component.elements, ["element-plugin", "element-image"]);
  assert.equal(project.pluginPointers[component.frame!].name, "frame-plugin");
  assert.equal(project.pluginPointers[component.introTransition.plugin!].name, "transition-plugin");
  assert.equal(component.outroTransition.plugin, null);
  assert.equal(component.outroTransition.duration, 200);

  const pluginElement = project.elements["element-plugin"] as AnyRecord;
  assert.equal(pluginElement.type, "plugin");
  assert.equal(project.pluginPointers[pluginElement.payload.plugin].name, "element-plugin");
  assert.equal(pluginElement.listeners.length, 2);

  const pluginListener = values(project.listeners).find(
    (listener) => listener.type === "plugin"
  ) as AnyRecord;
  assert.ok(pluginListener);
  assert.equal(pluginListener.id, pluginElement.listeners[0]);
  assert.equal(pluginListener.output, "var-set");
  assert.equal(pluginListener.payload.channel, "done");
  assert.equal(project.pluginPointers[pluginListener.payload.plugin].name, "listener-plugin");

  const customListener = values(project.listeners).find(
    (listener) => listener.type === "custom"
  ) as AnyRecord;
  assert.ok(customListener);
  assert.equal(customListener.output, null);

  const branch = project.nodes["branch-main"] as AnyRecord;
  assert.equal(branch.trueOutput, "var-set");
  assert.equal(branch.falseOutput, null);
  assert.ok(project.values[branch.valueA]);
  assert.ok(project.values[branch.valueB]);
  assert.equal(project.values[branch.valueA].process.length, 2);

  const variableSet = project.nodes["var-set"] as AnyRecord;
  assert.equal(variableSet.output, null);
  assert.ok(project.values[variableSet.value]);
  assert.equal(project.values[variableSet.value].process.length, 1);
}

function assertRealProjectMigration(input: V1.Data, project: V2.Data) {
  assert.equal(project.version, 2);
  assert.equal(project.appVersion, TEST_APP_VERSION);
  assert.equal(project.updatedAt, input.updatedAt);
  assert.equal(Object.keys(project.resources).length, input.resources.length);
  assert.equal(Object.keys(project.variables).length, input.variables.length);
  assert.equal(Object.keys(project.nodes).length, input.nodes.length);
  assert.equal(project.config.title, input.config.title);
  assert.equal(project.config.width, input.config.width);
  assert.equal(project.config.height, input.config.height);
  assert.equal(project.config.runtimePlugins?.length, 1);

  const runtimePluginId = project.config.runtimePlugins?.[0];
  assert.ok(runtimePluginId);
  assert.equal(project.pluginPointers[runtimePluginId].name, "nnfa-runtime");

  assert.ok(Object.keys(project.steps).length > 0);
  assert.ok(Object.keys(project.components).length > 0);
  assert.ok(Object.keys(project.elements).length > 0);
  assert.ok(Object.keys(project.listeners).length > 0);
  assert.ok(Object.keys(project.pluginPointers).length > 0);

  const createStep = findStep(project, "Component.create") as AnyRecord;
  assert.ok(createStep);
  assert.equal(typeof createStep.payload.componentId, "string");

  const pluginElement = findElement(project, "plugin") as AnyRecord;
  assert.ok(pluginElement);
  assert.ok(
    pluginElement.payload.plugin === null || project.pluginPointers[pluginElement.payload.plugin]
  );

  const customListener = findListener(project, "custom") as AnyRecord;
  assert.ok(customListener);
  assertOutputResolved(customListener.output);
}

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    throw error;
  }
}

export function runV2MigrationTest() {
  runCase("synthetic fixture migrates normalized project graph", () => {
    const project = migrateToV2(TEST_APP_VERSION, makeSyntheticV1Project());
    assertNoInlineOutputs(project);
    assertComponentGraphIsFlattened(project);
    assertValueGraphIsFlattened(project);
    assertNoEmptyPluginPointers(project);
    assertSyntheticMigration(project);
  });

  runCase("real project data migrates without losing core structure", () => {
    const input = realV1ProjectData as unknown as V1.Data;

    const project = migrateToV2(TEST_APP_VERSION, input);
    assertNoInlineOutputs(project);
    assertComponentGraphIsFlattened(project);
    assertValueGraphIsFlattened(project);
    assertNoEmptyPluginPointers(project);
    assertRealProjectMigration(input, project);
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  runV2MigrationTest();
}
