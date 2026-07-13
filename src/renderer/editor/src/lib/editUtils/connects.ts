import type { Types } from "@shared/projectData/types";
import { getProject } from "../../project/store";
import type { ProjectInstance } from "../../project/project";

export function getOutsFromNode(
  node: Types.Node,
  project: ProjectInstance = getProject(),
  forEach?: (targetId: string) => unknown
): Set<string> {
  const outs = new Set<string>();

  function add(targetId: string | null) {
    if (!targetId) return;
    outs.add(targetId);
    forEach?.(targetId);
  }
  if (node.nodeType === "entry" || node.nodeType === "variableSet") {
    add(node.output);
    return outs;
  }

  if (node.nodeType === "branch") {
    add(node.trueOutput);
    add(node.falseOutput);
    return outs;
  }

  node.steps.forEach((s) => {
    const step = project.getUnsafe("steps", s);
    if (!step || step.type !== "Component.create") return;

    project.getUnsafe("components", step.payload.componentId!).elements.forEach((e) => {
      project.getUnsafe("elements", e).listeners.forEach((l) => {
        add(project.getUnsafe("listeners", l).output);
      });
    });
  }); //eww
  return outs;
}

type NodeConnects = Record<"ins" | "outs", Map<string, Set<string>>>;
function getAllNodeConnects(project = getProject()): NodeConnects {
  const ins = new Map<string, Set<string>>();
  const outs = new Map<string, Set<string>>();

  project.nodes.values().forEach((node) => {
    outs.set(
      node.id,
      getOutsFromNode(
        node,
        project,
        (id) => ins.get(id)?.add(node.id) || ins.set(id, new Set([node.id]))
      )
    );
  });

  return { ins, outs };
}

function getAllChainedNodeIds(id: string, nodeConnects: NodeConnects): Set<string>;
function getAllChainedNodeIds(
  id: string,
  nodeConnects: NodeConnects,
  result: Set<string>
): Set<string> | undefined;
function getAllChainedNodeIds(
  id: string,
  nodeConnects: NodeConnects,
  result: Set<string> = new Set()
): Set<string> | undefined {
  if (result.has(id)) return;
  result.add(id);

  nodeConnects.ins.get(id)?.forEach((t) => getAllChainedNodeIds(t, nodeConnects, result));
  nodeConnects.outs.get(id)?.forEach((t) => getAllChainedNodeIds(t, nodeConnects, result));

  return result;
}

export function getAllChainedNodes(nodeId: string): Set<string> {
  const ids = getAllChainedNodeIds(nodeId, getAllNodeConnects());
  return ids;
}
