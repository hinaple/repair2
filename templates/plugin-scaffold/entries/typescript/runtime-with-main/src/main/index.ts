import type { RendererApi, RuntimeMainFactory } from "@fainthit/repair2-plugin-sdk";

type MainMethods = {
  foo(str: string): void;
};

type RendererMethods = {
  bar(str: string): void;
};

const createMain: RuntimeMainFactory<
  Record<string, unknown>,
  MainMethods,
  RendererMethods
> = () => {
  let renderer: RendererApi<RendererMethods>;

  return {
    activate({ renderer: nextRenderer }) {
      console.log("MAIN ACTIVATED");
      renderer = nextRenderer;
      return () => {
        console.log("DISPOSED");
      };
    },
    main: {
      foo(str) {
        renderer.bar(str);
      }
    }
  };
};

export default createMain;
