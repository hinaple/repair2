const BEZIER_OFFSET = 50;

export function makeBezierPoints(lineArr) {
    const data = [];
    lineArr.forEach((l) => {
        const x0 = l.fromCoord.x;
        const y0 = l.fromCoord.y;
        const x1 = l.toCoord.x;
        const y1 = l.toCoord.y;
        if (l.noBezier)
            data.push([
                [x0, y0],
                [x0, y0],
                [x1, y1],
                [x1, y1]
            ]);
        else if (l.fromId === l.output.to) {
            const joint = [(x0 + x1) / 2, y0 - BEZIER_OFFSET];
            data.push([
                [x0, y0],
                [x0 + BEZIER_OFFSET, y0],
                [x0 + BEZIER_OFFSET, y0 - BEZIER_OFFSET],
                joint
            ]);
            data.push([
                joint,
                [x1 - BEZIER_OFFSET, y1 - BEZIER_OFFSET],
                [x1 - BEZIER_OFFSET, y1],
                [x1, y1]
            ]);
        } else if (x1 <= x0) {
            const yCenter = (y0 + y1) / 2;
            const joint = [(x0 + x1) / 2, yCenter];
            data.push([
                [x0, y0],
                [x0 + BEZIER_OFFSET, y0],
                [x0 + BEZIER_OFFSET, (y0 + yCenter) / 2],
                joint
            ]);
            data.push([
                joint,
                [x1 - BEZIER_OFFSET, (y1 + yCenter) / 2],
                [x1 - BEZIER_OFFSET, y1],
                [x1, y1]
            ]);
        } else {
            data.push([
                [x0, y0],
                [Math.max(x0 + BEZIER_OFFSET, (x1 + x0) / 2), y0],
                [Math.min(x1 - BEZIER_OFFSET, (x1 + x0) / 2), y1],
                [x1, y1]
            ]);
        }
    });

    return data;
}
