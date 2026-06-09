import {
    PLUGIN_TYPES,
    PluginErrorData,
    PluginRunningTarget,
    type PluginAttributes,
    type PluginExports,
    type PluginLinkInfo,
    type PluginRendererInfo,
    type PluginType
} from "@shared/plugin.types";

import type { RollupWatcher } from "rollup";
import type { FSWatcher } from "chokidar";

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

export type PluginInfoData = {
    info: PluginInfo;
    data: PluginData;
    error: Partial<Record<PluginRunningTarget, PluginErrorData>>;
};

export type PluginData = {
    building?: Promise<boolean>;
    ready?: boolean;
    watchers?: RollupWatcher[];
    sourceWatcher?: ManifestWatcher;
};

export type ManifestHandler = (type: "change" | "unlink" | "add") => void;
export type ManifestCloser = () => any;
export type ManifestWatcher = {
    watcher: FSWatcher;
    close: () => Promise<void>;
    setCallbacks: (newCallback: ManifestHandler, newCloser: ManifestCloser) => ManifestWatcher;
};

export type ManifestError = {
    remove: (option?: { closeWatcher?: boolean; sendUpdate?: boolean }) => Promise<void>;
    dir: string;
    manifestDir: string;
    watch?: ManifestWatcher;
    lastError: string;
};

export type WatchData = {
    jsHash?: string;
    cssHash?: string;
    cssCode?: string;
    updated?: "all" | "css" | "none";
};
