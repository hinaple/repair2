import type { Tuple } from "@shared/utils.types";
import type { Output } from "./output";

export type BezierPoints = Tuple<8, number> | Tuple<16, number>;

const BEZIER_OFFSET = 50;

export function makeBezierPoint(l: Output): BezierPoints {
  const x0 = l.fromCoord!.x;
  const y0 = l.fromCoord!.y;
  const x1 = l.toCoord!.x;
  const y1 = l.toCoord!.y;
  if (l.noBezier) return [x0, y0, x0, y0, x1, y1, x1, y1];
  else if (l.fromId === l.output) {
    const joint: [number, number] = [(x0 + x1) / 2, y0 - BEZIER_OFFSET];
    return [
      x0,
      y0,
      x0 + BEZIER_OFFSET,
      y0,
      x0 + BEZIER_OFFSET,
      y0 - BEZIER_OFFSET,
      joint[0],
      joint[1],
      joint[0],
      joint[1],
      x1 - BEZIER_OFFSET,
      y1 - BEZIER_OFFSET,
      x1 - BEZIER_OFFSET,
      y1,
      x1,
      y1
    ];
  } else if (x1 <= x0) {
    const yCenter = (y0 + y1) / 2;
    const joint: [number, number] = [(x0 + x1) / 2, yCenter];
    return [
      x0,
      y0,
      x0 + BEZIER_OFFSET,
      y0,
      x0 + BEZIER_OFFSET,
      (y0 + yCenter) / 2,
      joint[0],
      joint[1],
      joint[0],
      joint[1],
      x1 - BEZIER_OFFSET,
      (y1 + yCenter) / 2,
      x1 - BEZIER_OFFSET,
      y1,
      x1,
      y1
    ];
  } else {
    return [
      x0,
      y0,
      Math.max(x0 + BEZIER_OFFSET, (x1 + x0) / 2),
      y0,
      Math.min(x1 - BEZIER_OFFSET, (x1 + x0) / 2),
      y1,
      x1,
      y1
    ];
  }
}

export function makeBezierPoints(lineArr: Output[]) {
  const data: BezierPoints[] = [];
  for (const l of lineArr) {
    data.push(makeBezierPoint(l));
  }

  return data;
}
