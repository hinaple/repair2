import type { RollupError } from "rollup";
import { LogFrom } from "./log.types";

export const PLUGIN_TYPES = ["runtime", "element", "transition", "function", "frame"] as const;

export type PluginType = (typeof PLUGIN_TYPES)[number];

export type PluginAttributes = string[];

export type PluginExports = Record<string, PluginAttributes | null>;

export type PluginLinkInfo = {
    sourcePath: string;
    linked: boolean;
};

export type PluginIdentity = {
    type: PluginType;
    name: string;
};

export type PluginErrorData = {
    phase: "build" | "runtime" | string;
    title: string;
    summary: string;
    logId: string;
};

export type PluginRendererInfo = PluginIdentity & {
    description?: string;
    entry: string;
    outDir: string;
    exports: PluginExports;
    svelte?: boolean;
    steps?: PluginExports;
    main?: {
        outDir: string;
        entry: string;
    };
    dir: string;
    path: string;
    distFile: string;
    mainDistFile?: string;
    linked: PluginLinkInfo | null;
    ready: boolean;
    error: [string, PluginErrorData][] | null;
};

export type PluginList = Record<string, PluginRendererInfo>;

export type PluginSingleUpdate = {
    info: PluginRendererInfo;
    previous: PluginIdentity | null;
    buildChanged: boolean;
};

export type PluginAllUpdate = {
    buildChanges: string[];
    errors?: { dir: string; reason?: string }[];
};

export type PluginErrorPayload = {
    name: string;
    type: PluginType;
    title: string;
    summary: string;
    error: string | RollupError | Error | any;
    logType?: string;
    from?: LogFrom;
    phase?: string;
    activeError?: boolean;
};

export type PluginRunningTarget = "main" | "renderer";

export type ManifestErrorForRenderer = {
    dir: string;
    manifestDir: string;
    error: string;
};
