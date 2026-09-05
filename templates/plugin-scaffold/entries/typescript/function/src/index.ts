import type { FunctionExport } from "@fainthit/repair2-plugin-sdk";

const run: FunctionExport = ({ attributes, ctx }) => {
  ctx.logger.info("HELLO, WORLD!");
};

export default run;
