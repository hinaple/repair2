export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue }
    | undefined;

export type JsonRecord = {
    [key: string]: JsonValue | undefined;
};

export type ScreenConfigType = "fullscreen" | "fullMultiScreen" | "windowMode" | string;

export type ScreenConfigStoreData = {
    type: ScreenConfigType | ScreenConfigType[];
    payload?: {
        x?: number;
        y?: number;
        [key: string]: JsonValue | undefined;
    };
};

export type ConfigStoreData = {
    title?: string;
    width?: number | null;
    height?: number | null;
    sizeRatio?: string | number | null;
    filter?: string | null;
    style?: string | null;
    editorShortcut?: string | null;
    editorPassword?: string | null;
    screenConfig?: ScreenConfigStoreData;
    multiScreen?: boolean;
    transparent?: boolean;
    alwaysOnTop?: boolean;
    devMode?: boolean;
    suppressGlobalKeys?: boolean;
    runtimePlugins?: JsonRecord[];
    [key: string]: JsonValue | undefined;
};

export type ViewportStoreData = {
    size?: number;
    pos?: {
        x: number;
        y: number;
    };
};

export type ResourceStoreData = JsonRecord & {
    id?: string;
    src?: string | null;
    alias?: string | null;
};

export type VariableStoreData = JsonRecord & {
    id?: string;
    name?: string | null;
    defaultValue?: JsonValue;
};

export type NodeStoreData = JsonRecord & {
    type: string;
    id: string;
    alias?: string | null;
    nodePos?: {
        x: number;
        y: number;
    };
};

export type ProjectData = {
    config: ConfigStoreData;
    nodes: NodeStoreData[];
    variables: VariableStoreData[];
    resources: ResourceStoreData[];
    viewport?: ViewportStoreData;
    VERSION?: string;
    updatedAt?: number;
};

export type EditorInitialData = ProjectData & {
    globalStyles: string;
};
