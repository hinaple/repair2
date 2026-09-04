import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Types } from "@shared/projectData/types";
import type { RegisterOwned } from "@shared/projectData/factories/factory";

type AnyRecord = Record<string, any>;

function assertRecord(value: unknown, message?: string): asserts value is AnyRecord {
  assert.equal(typeof value, "object", message);
  assert.notEqual(value, null, message);
  assert.equal(Array.isArray(value), false, message);
}

function override<T extends object>(value: unknown): Partial<T> {
  return value as Partial<T>;
}

const unusedRegisterOwned: RegisterOwned = () => "unused-owned-id";

function runCase(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    throw error;
  }
}

export async function runDataFactoryTest() {
  (globalThis as any).__APP_VERSION__ = "data-factory-test";

  const {
    createComponent,
    createBranch,
    createConfig,
    createElement,
    createListener,
    createProject,
    createResource,
    createStep,
    createTransition,
    createValueProcess,
    createVariableSet
  } = await import("@shared/projectData/factories");

  runCase("plain factory fills missing fields and preserves explicit values", () => {
    const resource = createResource({ id: "resource-1", src: "image.png" });

    assert.deepEqual(resource, {
      id: "resource-1",
      src: "image.png",
      alias: null
    });
  });

  runCase("nested typePayload factory fills nested payload defaults", () => {
    const config = createConfig(
      override<Types.ProjectConfig>({
        screenConfig: {
          type: "windowMode",
          payload: { x: 12 }
        }
      })
    );

    assert.deepEqual(config.screenConfig, {
      type: "windowMode",
      payload: { x: 12, y: 0 }
    });
  });

  runCase("typePayload factory matches payload to override type", () => {
    const step = createStep(
      override<Types.Step>({
        type: "Audio.play",
        payload: { resourceId: "audio-1", loop: true }
      }),
      unusedRegisterOwned
    );

    assert.equal(step.type, "Audio.play");
    assert.deepEqual(step.payload, {
      resourceId: "audio-1",
      channel: "default",
      volume: 100,
      loop: true
    });
  });

  runCase("empty type always produces null payload and ignores payload override", () => {
    const step = createStep(
      override<Types.Step>({
        type: "",
        payload: { delayMs: 999 }
      }),
      unusedRegisterOwned
    );

    assert.equal(step.type, "");
    assert.equal(step.payload, null);
  });

  runCase("unknown type does not throw and falls back to null payload", () => {
    const step = createStep(
      override<Types.Step>({
        type: "Unknown.Type",
        payload: { any: "thing" }
      }),
      unusedRegisterOwned
    );

    assert.equal((step as AnyRecord).type, "Unknown.Type");
    assert.equal((step as AnyRecord).payload, null);
  });

  runCase("payload for another type is ignored when selected type has different template", () => {
    const step = createStep(
      override<Types.Step>({
        type: "delay",
        payload: {
          resourceId: "audio-1",
          channel: "bgm",
          delayMs: 250
        }
      }),
      unusedRegisterOwned
    );

    assert.equal(step.type, "delay");
    assert.deepEqual(step.payload, { delayMs: 250 });
  });

  runCase("type object path returns null payload instead of partial invalid payload", () => {
    const step = createStep(
      override<Types.Step>({
        type: "Audio",
        payload: { play: true }
      }),
      unusedRegisterOwned
    );

    assert.equal((step as AnyRecord).type, "Audio");
    assert.equal((step as AnyRecord).payload, null);
  });

  runCase("null payload override means use default payload", () => {
    const listener = createListener(
      override<Types.Listener>({
        type: "keyPress",
        payload: null
      }),
      unusedRegisterOwned
    );

    assert.equal(listener.type, "keyPress");
    assert.deepEqual(listener.payload, { key: null });
  });

  runCase("wrong-shaped payload does not replace object template", () => {
    const listener = createListener(
      override<Types.Listener>({
        type: "keyPress",
        payload: "K"
      }),
      unusedRegisterOwned
    );

    assert.equal(listener.type, "keyPress");
    assert.deepEqual(listener.payload, { key: null });
  });

  runCase("primitive payload template can accept primitive override", () => {
    const listener = createListener(
      override<Types.Listener>({
        type: "input",
        payload: "typed text"
      }),
      unusedRegisterOwned
    );

    assert.equal(listener.type, "input");
    assert.equal(listener.payload, "typed text");
  });

  runCase("recordOf injects record key as id and record key wins over inner id", () => {
    const project = createProject(
      override<Types.Data>({
        resources: {
          "resource-key": {
            id: "wrong-id",
            src: "image.png"
          }
        }
      })
    );

    assert.deepEqual(project.resources["resource-key"], {
      id: "resource-key",
      src: "image.png",
      alias: null
    });
  });

  runCase("recordOf normalizes nested typePayload records", () => {
    const project = createProject(
      override<Types.Data>({
        listeners: {
          "listener-1": {
            id: "wrong-id",
            type: "keyPress",
            payload: { key: "A" }
          }
        },
        elements: {
          "element-1": {
            type: "input",
            payload: { variableId: "var-1" }
          }
        }
      })
    );

    assert.equal(project.listeners["listener-1"].id, "listener-1");
    assert.deepEqual(project.listeners["listener-1"].payload, { key: "A" });
    assert.equal(project.elements["element-1"].id, "element-1");
    assert.deepEqual(project.elements["element-1"].payload, {
      variableId: "var-1",
      placeholder: null,
      autofocus: false,
      maxLength: null,
      allowedType: "any",
      allowedRegex: null,
      valueFunction: null,
      isTextarea: false
    });
  });

  runCase("non-record record override becomes an empty record", () => {
    const project = createProject(
      override<Types.Data>({
        resources: null
      })
    );

    assert.deepEqual(project.resources, {});
  });

  runCase("bad record item still becomes a default object with injected id", () => {
    const project = createProject(
      override<Types.Data>({
        resources: {
          "resource-1": null
        }
      })
    );

    assert.deepEqual(project.resources["resource-1"], {
      id: "resource-1",
      src: null,
      alias: null
    });
  });

  runCase("nested non-record override falls back to nested defaults", () => {
    const project = createProject(
      override<Types.Data>({
        config: "bad config"
      })
    );

    assert.equal(project.config.title, "REPAIR v2");
    assert.deepEqual(project.config.screenConfig, {
      type: "fullscreen",
      payload: null
    });
  });

  runCase("component nested factories normalize partial nested objects", () => {
    let ownedIndex = 0;
    const component = createComponent(
      override<Types.Component>({
        id: "component-1",
        pos: { x: { distance: 20 } },
        introTransition: { duration: 100 }
      }),
      () => `owned-${++ownedIndex}`
    );

    assert.deepEqual(component.pos, {
      x: { distance: 20, origin: "start", relative: false },
      y: { distance: null, origin: "start", relative: false }
    });
    assert.deepEqual(component.introTransition, {
      duration: 100,
      easing: "linear",
      delay: 0,
      plugin: "owned-2"
    });
    assert.equal(component.frame, "owned-1");
    assert.equal(component.outroTransition.plugin, "owned-3");
  });

  runCase("node factories register owned value records", () => {
    const registered: Array<{ type: string; data: unknown; id: string }> = [];
    const registerOwned: RegisterOwned = (type, data) => {
      const id = `owned-value-${registered.length + 1}`;
      registered.push({ type, data, id });
      return id;
    };

    const branch = createBranch(undefined, registerOwned);
    const variableSet = createVariableSet(undefined, registerOwned);

    assert.equal(branch.valueA, "owned-value-1");
    assert.equal(branch.valueB, "owned-value-2");
    assert.equal(variableSet.value, "owned-value-3");
    assert.deepEqual(
      registered.map(({ type, data }) => ({ type, data })),
      [
        { type: "values", data: { baseType: "string", baseValue: null, process: [] } },
        { type: "values", data: { baseType: "string", baseValue: null, process: [] } },
        { type: "values", data: { baseType: "string", baseValue: null, process: [] } }
      ]
    );
  });

  runCase("owned factory uses the ID returned by registerOwned", () => {
    let registeredType: string | undefined;
    let registeredData: unknown;
    const transition = createTransition(undefined, (type, data) => {
      registeredType = type;
      registeredData = data;
      return "plugin-pointer-1";
    });

    assert.equal(registeredType, "pluginPointers");
    assert.deepEqual(registeredData, {
      name: null,
      exportName: "default",
      payloads: {}
    });
    assert.equal(transition.plugin, "plugin-pointer-1");
  });

  runCase("owned factory falls back to data.id when registerOwned returns nothing", () => {
    let componentId: string | undefined;
    let pluginIndex = 0;
    const step = createStep({ type: "Component.create" }, (type, data) => {
      if (type === "pluginPointers") return `plugin-${++pluginIndex}`;
      if (type === "components") componentId = (data as Types.Component).id;
    });

    assert.equal(step.type, "Component.create");
    assert.equal(step.payload.componentId, componentId);
  });

  runCase("owned factory throws when registration cannot provide an ID", () => {
    assert.throws(() => createTransition(undefined, () => undefined), /has no string id/);
  });

  runCase("owned factory throws when registerOwned is missing at runtime", () => {
    const unsafeCreate = createTransition as unknown as () => Types.Transition;
    assert.throws(() => unsafeCreate(), /registerOwned is required/);
  });

  runCase("dragOption union handles disabled and enabled shapes", () => {
    const disabled = createElement({ dragOption: { use: false } });
    const enabled = createElement(
      override<Types.Element>({
        dragOption: {
          use: true,
          hotspots: [{ x: { distance: 5 } }]
        }
      }),
      unusedRegisterOwned
    );

    assert.deepEqual(disabled.dragOption, { use: false });
    assertRecord(enabled.dragOption);
    assert.equal(enabled.dragOption.use, true);
    assert.deepEqual(enabled.dragOption.hotspots, [
      {
        x: { distance: 5, origin: "start", relative: false },
        y: { distance: null, origin: "start", relative: false }
      }
    ]);
  });

  runCase("valueProcess type payload defaults are filled", () => {
    const valueProcess = createValueProcess(
      override<Types.ValueProcess>({
        id: "vp-1",
        type: "replaceAll",
        payload: { from: "a" }
      }),
      unusedRegisterOwned
    );

    assert.deepEqual(valueProcess, {
      id: "vp-1",
      type: "replaceAll",
      payload: { from: "a", to: "" }
    });
  });

  runCase("empty object payload templates preserve arbitrary override fields", () => {
    const payloads = { intervalMs: 500, mode: "precise", enabled: true };
    const step = createStep({
      type: "Others.runtimePluginStep",
      payload: {
        pluginName: "runtime:clock",
        step: "tick",
        payloads,
        waitTillEnd: true
      }
    });

    assert.deepEqual(step.payload.payloads, payloads);
    assert.notEqual(step.payload.payloads, payloads);
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  await runDataFactoryTest();
}
