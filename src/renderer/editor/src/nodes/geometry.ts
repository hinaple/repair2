import { reloadNode } from "../lib/stores";
import { getProject } from "../project/store";

interface NodeSize {
  width: number;
  height: number;
}

const NodeSizes = new Map<string, NodeSize>();

export function setNodeSize(id: string, width: number, height: number) {
  NodeSizes.set(id, { width: width, height: height });
  reloadNode(id);
}
export function getNodeSize(id: string) {
  return NodeSizes.get(id);
}
export function deleteNodeGeometry(id: string) {
  NodeSizes.delete(id);
}
export function getAllInBoundsNodes(x1: number, y1: number, x2: number, y2: number) {
  const tx1 = Math.min(x1, x2),
    ty1 = Math.min(y1, y2),
    tx2 = Math.max(x1, x2),
    ty2 = Math.max(y1, y2);
  const inBounds = new Set<string>();
  const nodesMap = getProject().nodes;
  NodeSizes.entries().forEach(([id, s]) => {
    const p = nodesMap.get(id)?.nodePos;
    if (p && p.x >= tx1 && p.y >= ty1 && p.x + s.width <= tx2 && p.y + s.height <= ty2)
      inBounds.add(id);
  });

  return inBounds;
}
export function getAllNodeBounds() {
  const bounds = {
    x1: Infinity,
    y1: Infinity,
    x2: -Infinity,
    y2: -Infinity
  };
  const nodesMap = getProject().nodes;
  NodeSizes.entries().forEach(([id, s]) => {
    const p = nodesMap.get(id)?.nodePos;
    if (!p) return;
    bounds.x1 = Math.min(p.x, bounds.x1);
    bounds.y1 = Math.min(p.y, bounds.y1);
    bounds.x2 = Math.max(p.x + s.width, bounds.x2);
    bounds.y2 = Math.max(p.y + s.height, bounds.y2);
  });

  return bounds;
}
