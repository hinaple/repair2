import { screen } from "electron";

export function getFullScreenArea() {
    const screens = screen.getAllDisplays().map((d) => d.bounds);
    const rect = screens.reduce(
        ({ x1, y1, x2, y2 }, { x, y, width, height }) => ({
            x1: Math.min(x1, x),
            y1: Math.min(y1, y),
            x2: Math.max(x2, x + width),
            y2: Math.max(y2, y + height)
        }),
        {
            x1: screens[0].x,
            y1: screens[0].y,
            x2: screens[0].x + screens[0].width,
            y2: screens[0].y + screens[0].height
        }
    );
    return { x: rect.x1, y: rect.y1, width: rect.x2 - rect.x1, height: rect.y2 - rect.y1 };
}

export function getPrimaryScreenArea() {
    return screen.getPrimaryDisplay().bounds;
}

function getSizeRatio(config) {
    const ratio = (config.sizeRatio || "1")
        .toString()
        .split(",")
        .map((n) => n);
    return ratio.length === 2 ? ratio : [ratio[0], ratio[0]];
}

export function getWindowArea(config) {
    if (config.screenConfig.type === "fullscreen") return getPrimaryScreenArea();
    if (config.screenConfig.type === "fullMultiScreen") return getPrimaryScreenArea();
    const primaryScreenArea = getPrimaryScreenArea();
    const sizeRatio = getSizeRatio(config);
    console.log(sizeRatio);
    return {
        x: config.screenConfig.payload.x ?? 0,
        y: config.screenConfig.payload.y ?? 0,
        width: (config.width || primaryScreenArea.width) * sizeRatio[0],
        height: (config.height || primaryScreenArea.height) * sizeRatio[1]
    };
}
