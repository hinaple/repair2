import { addPreloadsBulk, removePreloadsAll, removePreloadsBulk } from "../../lib/resources";
import { setVar, resetAllVar } from "../../lib/variables";
import {
  addComponent,
  clearComponents,
  modifyComponentByAlias,
  removeComponentByAlias
} from "../../lib/components";
import {
  serialOpen,
  serialSend,
  serialClose,
  socketConnect,
  socketSend,
  socketDisconnect,
  socketConnectService
} from "../../lib/communication";
import { emitRepairEvent } from "../../lib/event";
import { playAudio, pauseAudio, resumeAudio, changeAudioVolume, resetAudio } from "../../lib/audio";
import { delay } from "../../lib/delay";
import { getProject } from "..";
import { sendChanges, sendTotalInfo } from "../../lib/runtimeMonitor";
import { callRuntimePluginStep, restartRuntimePlugins } from "../../lib/plugin/runtimePlugins";
import { customLog } from "../../lib/logger";
import { callFunctionPlugin } from "../../lib/plugin/pluginManager";
import { ipc } from "../../lib/ipc";
import type { StepAction } from "./types";
import type { Types } from "@shared/projectData/types";

let resetAbort = new AbortController();

const actions = {
  Component: {
    create: (s) => addComponent(s.payload.componentId!),
    remove: (s) => {
      if (s.payload.componentAlias)
        removeComponentByAlias(s.payload.componentAlias, s.payload.ignoreUnbreakable);
    },
    clear: (s) => clearComponents(s.payload.ignoreUnbreakable),
    modify: (s) => {
      if (!s.payload.componentAlias || !s.payload.modifyKey) return;

      modifyComponentByAlias(s.payload.componentAlias, s.payload.modifyKey, s.payload.modifyValue);
    }
  },
  Audio: {
    play: (s) =>
      typeof s.payload.resourceId === "string" &&
      playAudio(
        s.payload.channel ?? "default",
        s.payload.resourceId,
        s.payload.volume ?? 100,
        s.payload.loop
      ),
    pause: (s) => pauseAudio(s.payload.channel ?? "default"),
    resume: (s) => resumeAudio(s.payload.channel ?? "default"),
    changeVolume: (s) =>
      changeAudioVolume(
        s.payload.channel ?? "default",
        s.payload.volume ?? 100,
        s.payload.duration ?? 0
      ),
    reset: () => resetAudio()
  },
  Preload: {
    add: (s) => addPreloadsBulk(s.payload.resourceArr),
    release: (s) => removePreloadsBulk(s.payload.resourceArr),
    releaseAll: () => removePreloadsAll()
  },
  Communication: {
    Socket: {
      connect: (s) => {
        if (s.payload.url) socketConnect(s.payload.url);
      },
      connectService: (s) => {
        if (s.payload.type && s.payload.name) socketConnectService(s.payload.type, s.payload.name);
      },
      send: (s) => {
        if (s.payload.channel) socketSend(s.payload.channel, ...s.payload.data);
      },
      disconnect: () => {
        socketDisconnect();
      }
    },
    Serial: {
      open: (s) => {
        serialOpen(
          s.payload.portAlias ?? undefined,
          s.payload.port ?? undefined,
          s.payload.baudRate ?? undefined
        );
      },
      send: (s) => {
        serialSend(s.payload.data);
      },
      close: () => {
        serialClose();
      }
    }
  },

  delay: (s) => delay(s.payload.delayMs ?? 0, resetAbort.signal),
  Others: {
    customReset: (s) => {
      if (s.payload.audios) resetAudio();
      if (s.payload.variables) resetAllVar();
      if (s.payload.components) clearComponents(true);
      if (s.payload.steps) clearWaitingSteps();
      if (s.payload.preloads) removePreloadsAll();
      if (s.payload.entries) getProject().resetEntries();
      if (s.payload.runtimePlugins) restartRuntimePlugins();

      sendTotalInfo();
    },
    setVariable: (s) =>
      typeof s.payload.variableId === "string" &&
      setVar(s.payload.variableId, String(s.payload.value ?? "")),
    resetAllVariables: () => resetAllVar(),
    executePlugin: (s) => {
      if (typeof s.payload.plugin !== "string") return;

      const pp = getProject().data.pluginPointers.get(s.payload.plugin);
      if (!pp || typeof pp.name !== "string") return;

      const prom = callFunctionPlugin({
        name: pp.name,
        exportName: pp.exportName,
        argument: { attributes: pp.payloads, signal: resetAbort.signal }
      });
      return s.payload.waitTillEnd ? prom : true;
    },
    runtimePluginStep: (s) => {
      if (!s.payload.pluginName || !s.payload.step) return;

      const prom: any | Promise<any> = callRuntimePluginStep(
        s.payload.pluginName,
        s.payload.step,
        s.payload.payloads as Record<string, any>
      );
      return s.payload.waitTillEnd ? prom : true;
    },
    eventEmit: (s) => {
      if (s.payload.channel) emitRepairEvent(s.payload.channel, s.payload.data);
    },
    script: (s) => {
      try {
        if (typeof s.payload.code === "string") new Function(s.payload.code)();
      } catch (err) {
        console.error(err);
      }
    },
    log: (s) => {
      ipc.send("custom-log", s.payload.content);
      customLog(String(s.payload.content));
    }
  }
} satisfies StepAction;

export const WaitingSteps = new Map();

export function stepExecute(step: Types.Step) {
  const action = step.type
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], actions) as
    ((step: Types.Step) => boolean | undefined | Promise<boolean | undefined>) | undefined;
  if (!action) return null;

  const actionResult = action(step);
  if (typeof actionResult !== "object" || !actionResult.then) {
    sendChanges("step", "executed", step.id);
    return actionResult;
  }

  return new Promise((resolve) => {
    sendChanges("step", "started", step.id);
    const s = Symbol();
    WaitingSteps.set(s, {
      resolve,
      id: step.id
    });
    actionResult.then((result) => {
      const data = WaitingSteps.get(s);
      if (!data) return;
      data.resolve(result);
      sendChanges("step", "ended", data.id);
      WaitingSteps.delete(s);
    });
  });
}

export function clearWaitingSteps() {
  WaitingSteps.forEach(({ resolve }) => resolve(false));
  WaitingSteps.clear();
  resetAbort.abort();
  resetAbort = new AbortController();
}
