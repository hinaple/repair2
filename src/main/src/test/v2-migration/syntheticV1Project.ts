import type { V1Data } from "@shared/projectData/types";

export function makeSyntheticV1Project(): V1Data {
  return {
    VERSION: "2.5.1-next.synthetic",
    config: {
      title: "Synthetic migration fixture",
      width: 800,
      height: 600,
      runtimePlugins: [
        { name: "runtime-plugin", exportName: "default", payloads: { mode: "test" } },
        { name: null, exportName: "default", payloads: {} }
      ]
    },
    resources: [{ id: "res-image", src: "image.png", alias: null }],
    variables: [{ id: "var-name", name: "name", defaultValue: "Alice" }],
    nodes: [
      {
        type: "entry",
        id: "entry-start",
        alias: null,
        nodePos: { x: 0, y: 0 },
        entryType: ["startup"],
        payload: {},
        output: { to: "seq-main" }
      },
      {
        type: "sequence",
        id: "seq-main",
        alias: null,
        folded: false,
        inputColor: "#000",
        nodePos: { x: 200, y: 0 },
        output: { to: "branch-main" },
        steps: [
          {
            id: "step-create",
            title: null,
            type: ["Component", "create"],
            payload: {
              id: "component-main",
              alias: "main",
              zIndex: 3,
              pos: {},
              unbreakable: false,
              visible: true,
              style: null,
              frame: {
                name: "frame-plugin",
                exportName: "default",
                payloads: { chrome: "thin" }
              },
              introTransition: {
                duration: 100,
                delay: 10,
                easing: "linear",
                plugin: {
                  name: "transition-plugin",
                  exportName: "intro",
                  payloads: {}
                }
              },
              outroTransition: {
                duration: 200,
                delay: 20,
                easing: "ease-in",
                plugin: {
                  name: null,
                  exportName: "default",
                  payloads: {}
                }
              },
              elements: [
                {
                  id: "element-plugin",
                  type: ["plugin"],
                  payload: {
                    name: "element-plugin",
                    exportName: "default",
                    payloads: { text: "hello" }
                  },
                  alias: null,
                  width: null,
                  height: null,
                  style: null,
                  childStyle: null,
                  className: null,
                  pos: {},
                  absolute: false,
                  fullscreen: false,
                  dragOption: {},
                  listeners: [
                    {
                      type: ["plugin"],
                      payload: {
                        channel: "done",
                        plugin: {
                          name: "listener-plugin",
                          exportName: "default",
                          payloads: {}
                        }
                      },
                      output: { to: "var-set" },
                      repeatCount: 1,
                      repeatInterval: 0,
                      once: false,
                      global: false,
                      useCapture: false
                    },
                    {
                      type: ["custom"],
                      payload: { channel: "ignored" },
                      output: { to: null },
                      repeatCount: 1,
                      repeatInterval: 0,
                      once: false,
                      global: false,
                      useCapture: false
                    }
                  ]
                },
                {
                  id: "element-image",
                  type: ["image"],
                  payload: { resourceId: "res-image", removePreload: true },
                  alias: null,
                  width: 100,
                  height: null,
                  style: null,
                  childStyle: null,
                  className: null,
                  pos: {},
                  absolute: false,
                  fullscreen: false,
                  dragOption: {},
                  listeners: []
                }
              ]
            }
          },
          {
            id: "step-execute-plugin",
            title: null,
            type: ["Others", "executePlugin"],
            payload: {
              plugin: {
                name: "function-plugin",
                exportName: "default",
                payloads: { action: "run" }
              },
              waitTillEnd: true
            }
          },
          {
            id: "step-log",
            title: "log",
            type: ["Others", "log"],
            payload: { content: "done" }
          }
        ]
      },
      {
        type: "branch",
        id: "branch-main",
        alias: null,
        nodePos: { x: 400, y: 0 },
        trueOutput: { to: "var-set" },
        falseOutput: { to: null },
        operator: "equals",
        scriptData: null,
        disableAfterTrue: false,
        disableAfterFalse: false,
        valueA: {
          baseType: "variable",
          baseValue: "var-name",
          process: [
            { type: ["trim"], payload: null },
            { type: ["toLowerCase"], payload: null }
          ]
        },
        valueB: {
          baseType: "string",
          baseValue: "alice",
          process: []
        }
      },
      {
        type: "variableSet",
        id: "var-set",
        alias: null,
        folded: false,
        inputColor: "#000",
        nodePos: { x: 600, y: 0 },
        value: {
          baseType: "string",
          baseValue: "complete",
          process: [{ type: ["replaceAll"], payload: { from: "complete", to: "done" } }]
        },
        variableId: "var-name",
        output: { to: null }
      }
    ],
    updatedAt: 1
  } as V1Data;
}
