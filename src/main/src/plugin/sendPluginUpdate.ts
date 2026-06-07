import type {
    ManifestErrorForRenderer,
    PluginList,
    PluginRendererInfo,
    PluginType
} from "@shared/plugin.types";
import type { PluginManager } from "./pluginManager";
import type { PluginInfo, PluginInfoData } from "./type";

type PreviousData = {
    type: PluginType;
    name: string;
};

export type UpdateHandlerParams =
    | {
          type: "single";
          updateData: {
              info: PluginRendererInfo;
              previous: PreviousData | null;
              buildChanged: boolean;
          };
      }
    | {
          type: "all";
          updateData: {
              plugins: PluginList;
              buildChanges: string[];
              manifestErrors: ManifestErrorForRenderer[];
          };
      }
    | {
          type: "manifest-error";
          updateData: { manifestErrors: ManifestErrorForRenderer[] };
      }
    | {
          type: "removed";
          updateData: { info: { name: string; type: PluginType } };
      }
    | {
          type: "runtime-error";
          updateData: { info: PluginRendererInfo };
      }
    | {
          type: "hmr";
          updateData: { info: PluginRendererInfo };
      };

export type UpdateHandler = (updateInfo: UpdateHandlerParams) => void;

export function makeSimplePluginList(plugins: Map<string, PluginInfoData>) {
    const result: Record<string, PluginRendererInfo> = {};
    plugins.forEach((p, pluginName) => {
        if (typeof p.info.exports === "object" && Object.keys(p.info.exports).length)
            result[pluginName] = makeInfoForRenderer(p);
    });
    return result;
}

export function makeManifestErrorsForRenderer(
    pluginManager: PluginManager
): ManifestErrorForRenderer[] {
    return [
        ...pluginManager.manifestErrors
            .entries()
            .map(([dir, { manifestDir, lastError }]) => ({ dir, manifestDir, error: lastError }))
    ];
}

function makeInfoForRenderer({ info, data, error }: PluginInfoData): PluginRendererInfo {
    const errorEntries = Object.entries(error);
    return { ...info, ready: !!data.ready, error: errorEntries.length ? errorEntries : null };
}

export function createSender(pluginManager: PluginManager, onUpdate: UpdateHandler) {
    function sendUpdate(
        data:
            | { type: "all"; buildChanges: string[] }
            | {
                  type: "single";
                  plugin: PluginInfoData;
                  previous: PreviousData | null;
                  buildChanged: boolean;
              }
            | { type: "hmr" | "runtime-error"; plugin: PluginInfoData }
            | { type: "removed"; pluginInfo: PluginInfo }
            | { type: "manifest-error" }
    ): void {
        if (pluginManager.destroyed) return;

        let payload: UpdateHandlerParams;
        if (data.type === "all") {
            payload = {
                type: data.type,
                updateData: {
                    plugins: makeSimplePluginList(pluginManager.plugins),
                    buildChanges: data.buildChanges,
                    manifestErrors: makeManifestErrorsForRenderer(pluginManager)
                }
            };
        } else if (data.type === "single") {
            payload = {
                type: data.type,
                updateData: {
                    info: makeInfoForRenderer(data.plugin),
                    previous: data.previous,
                    buildChanged: data.buildChanged
                }
            };
        } else if (data.type === "hmr" || data.type === "runtime-error") {
            payload = {
                type: data.type,
                updateData: {
                    info: makeInfoForRenderer(data.plugin)
                }
            };
        } else if (data.type === "manifest-error") {
            payload = {
                type: data.type,
                updateData: { manifestErrors: makeManifestErrorsForRenderer(pluginManager) }
            };
        } else if (data.type === "removed") {
            payload = {
                type: data.type,
                updateData: { info: { name: data.pluginInfo.name, type: data.pluginInfo.type } }
            };
        } else throw new Error(`${data.type} is unknown plugin send type.`);

        onUpdate(payload);
    }

    return sendUpdate;
}

export type UpdateSender = ReturnType<typeof createSender>;
