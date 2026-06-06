import type { LogEntry } from "./log.types";
import type { RollupError } from "rollup";

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
    phase: "build" | "runtime";
    title: string;
    detail: RollupError | string;
    logId: string;
    summary?: string;
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

export type PluginReportOptions = {
    type?: string;
    phase?: string;
    summary?: string;
};

export type PluginErrorPayload = {
    name: string;
    title?: string;
    error: string | RollupError;
    logOptions?: PluginReportOptions;
};

export type PluginRunningTarget = "main" | "renderer";
