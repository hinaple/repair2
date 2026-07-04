import type { Types } from "@shared/projectData/types";

const styleMap = {
    width: ["width: ", "px"],
    height: ["height: ", "px"],
    filter: ["filter: ", ""],
    sizeRatio: ["transform: scale(", ")"],
    style: ["", ""]
} as const;

export function applyStyle(
    body: HTMLElement,
    container: HTMLDivElement,
    config: Types.ProjectConfig
) {
    if (config.width) body.style.setProperty("--gamezone-width", `${config.width}px`);
    if (config.height) body.style.setProperty("--gamezone-height", `${config.height}px`);

    if (config.transparent) body.style.background = "transparent";

    const baseStyleString =
        (config.transparent ? "background-color: transparent;" : "") +
        Object.entries(styleMap)
            .reduce<string[]>((acc, [key, [prefix, suffix]]) => {
                const currentStyleConfig = config[key as keyof typeof styleMap];
                if (
                    currentStyleConfig !== null &&
                    (typeof currentStyleConfig === "number" || currentStyleConfig.trim().length)
                ) {
                    acc.push(`${prefix}${currentStyleConfig}${suffix}`);
                }
                return acc;
            }, [])
            .join("; ") +
        ";";
    container.setAttribute("style", baseStyleString);
}
