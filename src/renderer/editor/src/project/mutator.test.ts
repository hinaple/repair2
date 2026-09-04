import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { convertToRuntime } from "../../../../main/src/project/dataConvert/convertStoreData";
import type { RegisterOwned } from "@shared/projectData/factories/factory";
import { clearHistory, redo, undo } from "../lib/editUtils/history";
import { ipc } from "../lib/ipc";
import { ProjectMutator } from "./mutator";
import { ProjectInstance } from "./project";

function runCase(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn()).then(() => console.log(`[PASS] ${name}`));
}

async function createTestContext() {
  Object.assign(globalThis, { __APP_VERSION__: "project-mutator-test" });
  const { createProject } = await import("@shared/projectData/factories");
  const project = new ProjectInstance(convertToRuntime(createProject()));
  return { project, mutator: new ProjectMutator(project) };
}

export async function runProjectMutatorTest() {
  await clearHistory();

  await runCase("transaction records owned creation as one undoable change", async () => {
    const { createBranch } = await import("@shared/projectData/factories");
    const { project, mutator } = await createTestContext();

    mutator.transaction(() => {
      const registerOwned: RegisterOwned = (type, data) => {
        const id = `value-${project.values.size + 1}`;
        return mutator.add(type, id, data);
      };
      const branch = createBranch({ id: "branch-1" }, registerOwned);
      mutator.add("nodes", branch.id, branch);
    });

    assert.equal(project.nodes.size, 1);
    assert.equal(project.values.size, 2);
    await undo();
    assert.equal(project.nodes.size, 0);
    assert.equal(project.values.size, 0);
    await redo();
    assert.equal(project.nodes.size, 1);
    assert.equal(project.values.size, 2);
  });

  await clearHistory();
  await runCase("failed transaction rolls every applied patch back", async () => {
    const { createSequence } = await import("@shared/projectData/factories");
    const { project, mutator } = await createTestContext();
    const sequence = createSequence({ id: "sequence-1", alias: "before" });
    project.setRecord("nodes", sequence.id, sequence);

    assert.throws(() =>
      mutator.transaction(() => {
        mutator.record("nodes", sequence.id).field("alias").set("after");
        mutator.add("values", "value-1", {
          baseType: "string",
          baseValue: null,
          process: []
        });
        throw new Error("rollback");
      })
    );

    assert.equal(project.getUnsafe("nodes", sequence.id).alias, "before");
    assert.equal(project.values.has("value-1"), false);
    await undo();
    assert.equal(project.getUnsafe("nodes", sequence.id).alias, "before");
  });

  await clearHistory();
  await runCase("deleteTree removes OWN descendants but retains REF targets", async () => {
    const { createBranch, createSequence } = await import("@shared/projectData/factories");
    const { project, mutator } = await createTestContext();
    const target = createSequence({ id: "sequence-target" });
    project.setRecord("nodes", target.id, target);

    const registerOwned: RegisterOwned = (type, data) => {
      const id = `value-${project.values.size + 1}`;
      project.setRecord(type, id, data);
      return id;
    };
    const branch = createBranch({ id: "branch-1", trueOutput: target.id }, registerOwned);
    project.setRecord("nodes", branch.id, branch);

    mutator.deleteTree("nodes", branch.id);
    assert.equal(project.nodes.has(branch.id), false);
    assert.equal(project.values.size, 0);
    assert.equal(project.nodes.has(target.id), true);
    await undo();
    assert.equal(project.nodes.has(branch.id), true);
    assert.equal(project.values.size, 2);
  });

  await clearHistory();
  await runCase("continuous edit commits once and supports undo and redo", async () => {
    const { createSequence } = await import("@shared/projectData/factories");
    const { project, mutator } = await createTestContext();
    const sequence = createSequence({ id: "sequence-1", alias: "before" });
    project.setRecord("nodes", sequence.id, sequence);

    const originalSend = ipc.send;
    const saveStates: string[] = [];
    ipc.send = ((channel: string) => {
      if (channel === "saved" || channel === "unsaved") saveStates.push(channel);
    }) as typeof ipc.send;
    try {
      const revertedSession = mutator.record("nodes", sequence.id).field("alias").begin();
      revertedSession.update("middle");
      assert.equal(saveStates.at(-1), "unsaved");
      revertedSession.update("before");
      assert.equal(saveStates.at(-1), "saved");
      revertedSession.commit();

      const session = mutator.record("nodes", sequence.id).field("alias").begin();
      session.update("middle");
      session.update("after");
      assert.equal(saveStates.at(-1), "unsaved");
      mutator.commitPendingEdits();
      assert.equal(project.getUnsafe("nodes", sequence.id).alias, "after");
      await undo();
      assert.equal(project.getUnsafe("nodes", sequence.id).alias, "before");
      await redo();
      assert.equal(project.getUnsafe("nodes", sequence.id).alias, "after");
    } finally {
      ipc.send = originalSend;
    }
  });

  await clearHistory();
  await runCase("deep OWN deletion restores the complete tree on undo", async () => {
    const { createComponent, createElement, createListener } =
      await import("@shared/projectData/factories");
    const { project, mutator } = await createTestContext();
    const registerOwned: RegisterOwned = (type, data) => {
      const id = `plugin-${project.pluginPointers.size + 1}`;
      project.setRecord(type, id, data);
      return id;
    };
    const listener = createListener({ id: "listener-1", type: "plugin" }, registerOwned);
    const element = createElement(
      { id: "element-1", type: "plugin", listeners: [listener.id] },
      registerOwned
    );
    const component = createComponent({ id: "component-1", elements: [element.id] }, registerOwned);
    project.setRecord("listeners", listener.id, listener);
    project.setRecord("elements", element.id, element);
    project.setRecord("components", component.id, component);
    const pluginCount = project.pluginPointers.size;

    mutator.deleteTree("components", component.id);
    assert.equal(project.components.size, 0);
    assert.equal(project.elements.size, 0);
    assert.equal(project.listeners.size, 0);
    assert.equal(project.pluginPointers.size, 0);
    await undo();
    assert.equal(project.components.size, 1);
    assert.equal(project.elements.size, 1);
    assert.equal(project.listeners.size, 1);
    assert.equal(project.pluginPointers.size, pluginCount);
  });

  await clearHistory();
  await runCase(
    "disconnectOutputsTo clears every node and listener reference together",
    async () => {
      const { createBranch, createListener, createSequence } =
        await import("@shared/projectData/factories");
      const { project, mutator } = await createTestContext();
      const target = createSequence({ id: "target" });
      const source = createSequence({ id: "source", output: target.id });
      const registerOwned: RegisterOwned = (type, data) => {
        const id = `value-${project.values.size + 1}`;
        project.setRecord(type, id, data);
        return id;
      };
      const branch = createBranch(
        { id: "branch", trueOutput: target.id, falseOutput: target.id },
        registerOwned
      );
      const listener = createListener({ id: "listener", output: target.id });
      project.setRecord("nodes", target.id, target);
      project.setRecord("nodes", source.id, source);
      project.setRecord("nodes", branch.id, branch);
      project.setRecord("listeners", listener.id, listener);

      mutator.disconnectOutputsTo(target.id);
      const disconnectedSource = project.getUnsafe("nodes", source.id);
      const disconnectedBranch = project.getUnsafe("nodes", branch.id);
      if (disconnectedSource.nodeType !== "sequence" || disconnectedBranch.nodeType !== "branch")
        throw new Error("Unexpected node type in test setup.");
      assert.equal(disconnectedSource.output, null);
      assert.equal(disconnectedBranch.trueOutput, null);
      assert.equal(disconnectedBranch.falseOutput, null);
      assert.equal(project.getUnsafe("listeners", listener.id).output, null);
      await undo();
      const restoredSource = project.getUnsafe("nodes", source.id);
      const restoredBranch = project.getUnsafe("nodes", branch.id);
      if (restoredSource.nodeType !== "sequence" || restoredBranch.nodeType !== "branch")
        throw new Error("Unexpected node type after undo.");
      assert.equal(restoredSource.output, target.id);
      assert.equal(restoredBranch.trueOutput, target.id);
      assert.equal(restoredBranch.falseOutput, target.id);
      assert.equal(project.getUnsafe("listeners", listener.id).output, target.id);
    }
  );

  await clearHistory();
  await runCase("subscriptions notify only the modified record target", async () => {
    const { createSequence } = await import("@shared/projectData/factories");
    const { project, mutator } = await createTestContext();
    const first = createSequence({ id: "first" });
    const second = createSequence({ id: "second" });
    project.setRecord("nodes", first.id, first);
    project.setRecord("nodes", second.id, second);
    let firstChanges = 0;
    let secondChanges = 0;
    const unsubFirst = mutator.subscribe(
      { kind: "record", type: "nodes", id: first.id },
      () => firstChanges++
    );
    const unsubSecond = mutator.subscribe(
      { kind: "record", type: "nodes", id: second.id },
      () => secondChanges++
    );

    mutator.record("nodes", first.id).field("alias").set("changed");
    assert.equal(firstChanges, 1);
    assert.equal(secondChanges, 0);
    await undo();
    assert.equal(firstChanges, 2);
    assert.equal(secondChanges, 0);
    unsubFirst();
    unsubSecond();
  });

  await clearHistory();
  await runCase(
    "record deletion keeps subscriptions without invalidating a missing record",
    async () => {
      const { createSequence } = await import("@shared/projectData/factories");
      const { project, mutator } = await createTestContext();
      const sequence = createSequence({ id: "sequence-1" });
      project.setRecord("nodes", sequence.id, sequence);
      const operations: string[] = [];
      const unsubscribe = mutator.subscribe(
        { kind: "record", type: "nodes", id: sequence.id },
        (change) => operations.push(change.operation)
      );

      mutator.delete("nodes", sequence.id);
      assert.equal(project.nodes.has(sequence.id), false);
      assert.deepEqual(operations, ["deleteRecord"]);

      await undo();
      assert.equal(project.nodes.has(sequence.id), true);
      assert.deepEqual(operations, ["deleteRecord", "deleteRecord"]);
      unsubscribe();
    }
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  await runProjectMutatorTest();
}
