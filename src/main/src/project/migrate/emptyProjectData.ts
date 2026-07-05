import { StoredProjectData } from "@shared/projectData/types";

export function makeEmptyProjectData(appVersion: string): StoredProjectData {
  return {
    version: 2,
    appVersion,
    config: {
      title: "RepairV2",
      width: null,
      height: null,
      sizeRatio: null,
      filter: null,
      style: null,
      editorShortcut: "E",
      editorPassword: null,
      transparent: false,
      alwaysOnTop: false,
      devMode: false,
      suppressGlobalKeys: false,
      runtimePlugins: [],
      screenConfig: {
        type: "fullscreen",
        payload: null
      }
    },
    resources: {},
    variables: {},
    nodes: {},
    steps: {},
    components: {},
    elements: {},
    listeners: {},
    values: {},
    valueProcesses: {},
    pluginPointers: {},
    updatedAt: Date.now()
  };
}
