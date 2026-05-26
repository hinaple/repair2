export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"] as const;
export type PluginType = (typeof PLUGIN_TYPES)[number];

export type PluginManifest = {
    name: string;
    description?: string;
    type: PluginType;
    entry: string;
    outDir: string;
    attributes: string[];
    svelte?: boolean;
    steps?: Record<string, null | string[]>;
    main?: {
        outDir: string;
        entry: string;
    };
};
export type RawManifest = {
    name: string;
    description?: string;
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
    svelte?: boolean;
};
export type PluginInfo = PluginManifest & {
    dir: string;
    path: string;
    distFile: string;
    mainDistFile?: string;
    linked?: {
        sourcePath: string;
        linked: boolean;
    };
};
