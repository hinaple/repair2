import { addHistory } from "../../lib/workHistory";
import { getAllConnectedLines, setAllOutput } from "../../nodes/lines/line";
import { SvelteMap } from "svelte/reactivity";

import Resource from "./resource.svelte";
import Variable from "./variable.svelte";
import { NodeClasses } from "../utils";
import Config from "./config.svelte";
import type { RuntimeProjectData, Types } from "@shared/projectData/types";
import type { Entries } from "@shared/projectData/utils.types";

type MapToSvelteMap<T> = {
  [K in keyof T]: T[K] extends Map<infer MK, infer MV> ? SvelteMap<MK, MV> : T[K];
};
type SvelteProject = MapToSvelteMap<RuntimeProjectData>;

function entriesOf<T extends object>(obj: T) {
  return Object.entries(obj) as Entries<T>;
}
function assignProjectData(target: SvelteProject, data: RuntimeProjectData) {
  for (const [key, value] of entriesOf(data)) {
    //@ts-expect-error
    target[key] = (
      value instanceof Map
        ? new SvelteMap(
            //@ts-expect-error
            value
          )
        : value
    ) as SvelteProject[typeof key];
  }
}

export interface Project extends SvelteProject {}
export class Project {
  constructor(data: RuntimeProjectData) {
    assignProjectData(this, data);
  }
  //   findVariableById(id) {
  //     return this.variables.find((v) => v.id === id);
  //   }
  //   findNodeById(id) {
  //     return this.nodes.get(id);
  //   }
  addNode(node: Types.Node) {
    addHistory({
      doFn: (d) => {
        this.nodes.set(d.id, d);
      },
      undoFn: (id) => {
        this.nodes.delete(id);
      },
      doData: node,
      undoData: node.id
    });
  }
  addManyNodes(nodes: Types.Node[]) {
    addHistory({
      doFn: (nodes) => {
        nodes.forEach((node) => {
          this.nodes.set(node.id, node);
        });
      },
      undoFn: (nodes) => {
        nodes.forEach(({ id }) => this.nodes.delete(id));
      },
      doData: nodes,
      undoData: nodes
    });
  }
  removeNode(node: Types.Node) {
    const connectedLines = getAllConnectedLines(node.id);
    addHistory({
      doFn: ({ id, connectedLines }) => {
        this.nodes.delete(id);
        setAllOutput(connectedLines, null);
      },
      undoFn: ({ node, connectedLines }) => {
        this.nodes.set(node.id, node);
        setAllOutput(connectedLines, node.id);
      },
      doData: { id: node.id, connectedLines },
      undoData: { node, connectedLines }
    });
  }
  removeManyNodes(nodes) {
    const connectedLines = nodes.map((node) => getAllConnectedLines(node.id));
    addHistory({
      doFn: ({ nodes, connectedLines }) => {
        nodes.forEach(({ id }, i) => {
          this.nodes.delete(id);
          setAllOutput(connectedLines[i], null);
        });
      },
      undoFn: ({ nodes, connectedLines }) => {
        nodes.forEach((node, i) => {
          this.nodes.set(node.id, node);
          setAllOutput(connectedLines[i], node.id);
        });
      },
      doData: { nodes, connectedLines },
      undoData: { nodes, connectedLines }
    });
  }
  get nodeConnects() {
    const connects = new Map(
      this.nodes.values().map((n) => [
        n.id,
        {
          ins: new Set(),
          outs: new Set((n.outputs ?? [n.output])?.map((o) => o.to).filter(Boolean) ?? [])
        }
      ])
    );
    connects.forEach((c, id) => {
      c.outs.forEach((o) => connects.get(o).ins.add(id));
    });
    return connects;
  }
}
