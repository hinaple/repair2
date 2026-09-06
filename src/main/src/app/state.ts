import type { BrowserWindow } from "electron";
import type { RuntimeProjectData } from "@shared/projectData/types";
import type { SetHmrActive } from "../system/hmrs";
import type { ExternalTools } from "../system/externalTools";

export type MainState = {
  project: {
    data: RuntimeProjectData | null;
    cssCode: string;
  };
  window: {
    main: BrowserWindow | null;
    editor: BrowserWindow | null;
  };
  hmr: {
    setter: SetHmrActive | null;
    importing: Promise<unknown> | null;
    isActive: boolean;
  };
  externalTools: ExternalTools;
};

export function createMainAppState(): MainState {
  return {
    project: {
      data: null,
      cssCode: ""
    },
    window: {
      main: null,
      editor: null
    },
    hmr: {
      setter: null,
      importing: null,
      isActive: false
    },
    externalTools: {
      vscode: false,
      npm: false
    }
  };
}
