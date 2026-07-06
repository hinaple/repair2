import type { Types } from "@shared/projectData/types";
import { appData } from "../lib/syncData.svelte";

type NodeConnect = Record<"ins" | "outs", Set<string>>;

function getAllNodeConnects(): Map<string, NodeConnect> {
  const project = getProject();
  const connects = new Map(
    project.nodes.values().map((n) => [
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

function getAllChainedNodeIds(id: string, nodeConnects: Map<string, NodeConnect>): Set<string>;
function getAllChainedNodeIds(
  id: string,
  nodeConnects: Map<string, NodeConnect>,
  result: Set<string>
): Set<string> | undefined;
function getAllChainedNodeIds(
  id: string,
  nodeConnects: Map<string, NodeConnect>,
  result: Set<string> = new Set()
): Set<string> | undefined {
  if (result.has(id)) return;
  result.add(id);

  const connects = nodeConnects.get(id);
  if (!connects) return;
  connects.outs.forEach((o) => getAllChainedNodeIds(o, nodeConnects, result));
  connects.ins.forEach((i) => getAllChainedNodeIds(i, nodeConnects, result));

  return result;
}

export function getAllChainedNodes(node: Types.Node): Types.Node[] {
  const c = appData.nodeConnects;
  const ids = getAllChainedNodeIds(node.id, c);
  return ids
    .values()
    .map((i) => appData.findNodeById(i))
    .toArray();
}
