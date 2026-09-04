import type { Types } from "@shared/projectData/types";

export type MsgRuntimeMonitorChange =
  | [type: "step", status: "executed" | "started" | "ended", target: string]
  | [type: "preload", status: "added" | "released", target: string]
  | [type: "variable", status: "changed", target: string, value: string | null]
  | [type: "entry", status: "entered" | "disabled" | "activated", target: string]
  | [type: "component", status: "created" | "removed", target: string]
  | [type: "component", status: "set", target: string[]];

export type MsgRuntimeMonitorTotal = {
  variables: Map<string, string>;
  preloads: string[];
  steps: Map<string, number>;
  entries: string[];
  components: string[];
};

export type MsgRuntimeMonitorInfoArgs =
  | [channel: "update", data: MsgRuntimeMonitorChange[]]
  | [channel: "total", data: MsgRuntimeMonitorTotal];

export type MsgPreviewPayload = {
  component: Types.Component;
  elements: Map<string, Types.Element>;
};

export type EditorMessagePortMap = {
  "execute:request": [payload: { type: string; id: string }];
  "preview:info": [payload: MsgPreviewPayload];
  "preview:visible": [visible: boolean];
  "preview:start": [];
  "preview:stop": [];
  "monitor:start": [];
};
export type PlayMessagePortMap = {
  "monitor:info": MsgRuntimeMonitorInfoArgs;
};

type CommonOn = { start: []; end: [] };

type EditorMessagePortOnMap = EditorMessagePortMap & CommonOn;
type MessageFromEditorListener<C extends keyof EditorMessagePortOnMap> = (
  ...data: EditorMessagePortOnMap[C]
) => unknown;
export type OnMessageFromEditor = <C extends keyof EditorMessagePortOnMap>(
  channel: C,
  listener: MessageFromEditorListener<C>
) => void;

type PlayMessagePortOnMap = PlayMessagePortMap & CommonOn;
type MessageFromPlayListener<C extends keyof PlayMessagePortOnMap> = (
  ...data: PlayMessagePortOnMap[C]
) => unknown;
export type OnMessageFromPlay = <C extends keyof PlayMessagePortOnMap>(
  channel: C,
  listener: MessageFromPlayListener<C>
) => void;
