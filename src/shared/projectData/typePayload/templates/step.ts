import { nullDefault, owns, type TypePayloadUnion } from "./union.types";

export const StepPayloadTemplate = {
  Component: {
    $types: true,
    create: { componentId: owns("components") },
    remove: { componentAlias: nullDefault<string>(), ignoreUnbreakable: true },
    clear: { ignoreUnbreakable: false },
    modify: {
      componentAlias: nullDefault<string>(),
      modifyKey: nullDefault<string>(),
      modifyValue: null
    }
  },
  Preload: {
    $types: true,
    add: { resourceArr: [] },
    release: { resourceArr: [] },
    releaseAll: null
  },
  Audio: {
    $types: true,
    play: {
      resourceId: nullDefault<string>(),
      channel: "default",
      volume: 100,
      loop: false
    },
    pause: { channel: "default" },
    resume: { channel: "default" },
    changeVolume: { channel: "default", volume: 100, duration: 0 },
    reset: {}
  },
  Communication: {
    $types: true,
    Serial: {
      $types: true,
      open: {
        portAlias: nullDefault<string>(),
        port: nullDefault<string>(),
        baudRate: 9600
      },
      send: { data: nullDefault<string>() },
      close: null
    },
    Socket: {
      $types: true,
      connect: { url: nullDefault<string>() },
      connectService: { type: nullDefault<string>(), name: nullDefault<string>() },
      send: { channel: nullDefault<string>(), data: [null] },
      disconnect: null
    }
  },
  delay: { delayMs: 0 },
  Others: {
    $types: true,
    customReset: {
      audios: true,
      variables: true,
      components: true,
      steps: true,
      preloads: true,
      entries: true,
      runtimePlugins: true
    },
    setVariable: { variableId: nullDefault<string>(), value: null },
    resetAllVariables: null,
    executePlugin: { plugin: nullDefault<string>(), waitTillEnd: false },
    runtimePluginStep: {
      pluginName: nullDefault<string>(),
      step: nullDefault<string>(),
      payloads: {},
      waitTillEnd: false
    },
    eventEmit: {
      channel: nullDefault<string>(),
      data: null
    },
    script: { code: nullDefault<string>() },
    log: { content: nullDefault<string>() }
  }
} as const;

export type StepTypePayload = TypePayloadUnion<typeof StepPayloadTemplate>;
