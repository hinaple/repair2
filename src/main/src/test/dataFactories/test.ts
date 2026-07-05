import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Types } from "@shared/projectData/types";

type AnyRecord = Record<string, any>;

function assertRecord(value: unknown, message?: string): asserts value is AnyRecord {
  assert.equal(typeof value, "object", message);
  assert.notEqual(value, null, message);
  assert.equal(Array.isArray(value), false, message);
}

function override<T extends object>(value: unknown): Partial<T> {
  return value as Partial<T>;
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

export async function runDataFactoryTest() {
  (globalThis as any).__APP_VERSION__ = "data-factory-test";

  const {
    createComponent,
    createConfig,
    createElement,
    createListener,
    createProject,
    createResource,
    createStep,
    createValueProcess
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
    const config = createConfig(override<Types.ProjectConfig>({
      screenConfig: {
        type: "windowMode",
        payload: { x: 12 }
      }
    }));

    assert.deepEqual(config.screenConfig, {
      type: "windowMode",
      payload: { x: 12, y: 0 }
    });
  });

  runCase("typePayload factory matches payload to override type", () => {
    const step = createStep(override<Types.Step>({
      type: "Audio.play",
      payload: { resourceId: "audio-1", loop: true }
    }));

    assert.equal(step.type, "Audio.play");
    assert.deepEqual(step.payload, {
      resourceId: "audio-1",
      channel: "default",
      volume: 100,
      loop: true
    });
  });

  runCase("empty type always produces null payload and ignores payload override", () => {
    const step = createStep(override<Types.Step>({
      type: "",
      payload: { delayMs: 999 }
    }));

    assert.equal(step.type, "");
    assert.equal(step.payload, null);
  });

  runCase("unknown type does not throw and falls back to null payload", () => {
    const step = createStep(override<Types.Step>({
      type: "Unknown.Type",
      payload: { any: "thing" }
    }));

    assert.equal((step as AnyRecord).type, "Unknown.Type");
    assert.equal((step as AnyRecord).payload, null);
  });

  runCase("payload for another type is ignored when selected type has different template", () => {
    const step = createStep(override<Types.Step>({
      type: "delay",
      payload: {
        resourceId: "audio-1",
        channel: "bgm",
        delayMs: 250
      }
    }));

    assert.equal(step.type, "delay");
    assert.deepEqual(step.payload, { delayMs: 250 });
  });

  runCase("type object path returns null payload instead of partial invalid payload", () => {
    const step = createStep(override<Types.Step>({
      type: "Audio",
      payload: { play: true }
    }));

    assert.equal((step as AnyRecord).type, "Audio");
    assert.equal((step as AnyRecord).payload, null);
  });

  runCase("null payload override means use default payload", () => {
    const listener = createListener(override<Types.Listener>({
      type: "keyPress",
      payload: null
    }));

    assert.equal(listener.type, "keyPress");
    assert.deepEqual(listener.payload, { key: null });
  });

  runCase("wrong-shaped payload does not replace object template", () => {
    const listener = createListener(override<Types.Listener>({
      type: "keyPress",
      payload: "K"
    }));

    assert.equal(listener.type, "keyPress");
    assert.deepEqual(listener.payload, { key: null });
  });

  runCase("primitive payload template can accept primitive override", () => {
    const listener = createListener(override<Types.Listener>({
      type: "input",
      payload: "typed text"
    }));

    assert.equal(listener.type, "input");
    assert.equal(listener.payload, "typed text");
  });

  runCase("recordOf injects record key as id and record key wins over inner id", () => {
    const project = createProject(override<Types.Data>({
      resources: {
        "resource-key": {
          id: "wrong-id",
          src: "image.png"
        }
      }
    }));

    assert.deepEqual(project.resources["resource-key"], {
      id: "resource-key",
      src: "image.png",
      alias: null
    });
  });

  runCase("recordOf normalizes nested typePayload records", () => {
    const project = createProject(override<Types.Data>({
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
    }));

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
    const project = createProject(override<Types.Data>({
      resources: null
    }));

    assert.deepEqual(project.resources, {});
  });

  runCase("bad record item still becomes a default object with injected id", () => {
    const project = createProject(override<Types.Data>({
      resources: {
        "resource-1": null
      }
    }));

    assert.deepEqual(project.resources["resource-1"], {
      id: "resource-1",
      src: null,
      alias: null
    });
  });

  runCase("nested non-record override falls back to nested defaults", () => {
    const project = createProject(override<Types.Data>({
      config: "bad config"
    }));

    assert.equal(project.config.title, "REPAIR v2");
    assert.deepEqual(project.config.screenConfig, {
      type: "fullscreen",
      payload: null
    });
  });

  runCase("component nested factories normalize partial nested objects", () => {
    const component = createComponent(override<Types.Component>({
      id: "component-1",
      pos: { x: { distance: 20 } },
      introTransition: { duration: 100 }
    }));

    assert.deepEqual(component.pos, {
      x: { distance: 20, origin: "start", relative: false },
      y: { distance: null, origin: "start", relative: false }
    });
    assert.deepEqual(component.introTransition, {
      duration: 100,
      easing: "linear",
      delay: 0,
      plugin: null
    });
  });

  runCase("dragOption union handles disabled and enabled shapes", () => {
    const disabled = createElement({ dragOption: { use: false } });
    const enabled = createElement(override<Types.Element>({
      dragOption: {
        use: true,
        hotspots: [{ x: { distance: 5 } }]
      }
    }));

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
    const valueProcess = createValueProcess(override<Types.ValueProcess>({
      id: "vp-1",
      type: "replaceAll",
      payload: { from: "a" }
    }));

    assert.deepEqual(valueProcess, {
      id: "vp-1",
      type: "replaceAll",
      payload: { from: "a", to: "" }
    });
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  await runDataFactoryTest();
}
