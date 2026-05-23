export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"] as const;
export type PluginType = (typeof PLUGIN_TYPES)[number];

export type PluginManifest = {
    name: string;
    type: PluginType;
    entry: string;
    outDir: string;
    attributes: string[];
    steps?: Record<string, null | string[]>;
    svelte?: boolean;
    main?: {
        outDir: string;
        entry: string;
    };
};
export type RawManifest = {
    name: string;
    type: PluginType;
    entry?: string;
    outDir?: string;
    attributes?: string[];
    attr?: string[];
    steps?: string[] | Record<string, string[] | null>;
    main?: {
        outDir?: string;
        entry?: string;
    };
};
export type PluginInfo = PluginManifest & {
    path: string;
    distFile: string;
    mainDistFile?: string;
    linked?: {
        sourcePath: string;
    };
};
