import {
    PLUGIN_TYPES,
    type PluginAttributes,
    type PluginExports,
    type PluginLinkInfo,
    type PluginRendererInfo,
    type PluginType
} from "@shared/plugin.types";

export { PLUGIN_TYPES };
export type { PluginRendererInfo, PluginType };

export type PluginManifest = {
    name: string;
    description?: string;
    type: PluginType;
    entry: string;
    outDir: string;
    exports: PluginExports;
    svelte?: boolean;
    steps?: PluginExports;
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
    attributes?: PluginAttributes;
    attr?: string[];
    steps?: string[] | PluginExports;
    exports?: string[] | PluginExports;
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
    linked: PluginLinkInfo | null;
};
