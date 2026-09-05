import type { RuntimeExport, RuntimeStep } from "@fainthit/repair2-plugin-sdk";

const testStep: RuntimeStep = ({ ctx }) => {
  ctx.logger.info("TEST STEP");
};

const runtime: RuntimeExport = {
  activate({ attributes, ctx }) {
    ctx.logger.info("RUNTIME ACTIVATED");

    return () => {
      ctx.logger.info("RUNTIME DISPOSED");
    };
  },
  testStep
};

export default runtime;
