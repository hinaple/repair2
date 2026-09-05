import type { RuntimeContext, RuntimeFactory, RuntimeStep } from "@fainthit/repair2-plugin-sdk";

type Attributes = Record<string, unknown> & {
  arg: string;
};

type MainMethods = {
  foo(str: string): void;
};

type RendererMethods = {
  bar(str: string): void;
};

type Steps = {
  testStep: RuntimeStep<Attributes>;
};

const createRuntime: RuntimeFactory<Attributes, MainMethods, RendererMethods, Steps> = () => {
  let ctx: RuntimeContext;

  return {
    activate({ ctx: nextContext }) {
      ctx = nextContext;
      ctx.logger.info("RUNTIME ACTIVATED");
    },
    testStep({ ctx, attributes }) {
      ctx.logger.info(`SENDING: ${attributes.arg}`);
    },
    renderer: {
      bar(str) {
        ctx.logger.info(`RECEIVED: ${str}`);
      }
    },
    dispose() {
      ctx.logger.info("RUNTIME DISPOSED");
    }
  };
};

export default createRuntime;
