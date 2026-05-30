export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"] as const;
export type PluginType = (typeof PLUGIN_TYPES)[number];

type Attributes = string[];
export type PluginManifest = {
    name: string;
    description?: string;
    type: PluginType;
    entry: string;
    outDir: string;
    exports: Record<string, null | Attributes>;
    svelte?: boolean;
    steps?: Record<string, null | Attributes>;
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
    attributes?: Attributes;
    attr?: string[];
    steps?: string[] | Record<string, Attributes | null>;
    exports?: string[] | Record<string, Attributes | null>;
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
    linked: {
        sourcePath: string;
        linked: boolean;
    } | null;
};
