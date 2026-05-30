/** @type {import("@fainthit/repair2-plugin-sdk").RuntimeExport} */
export default {
    activate({ attributes, ctx }) {
        ctx.logger.info("RUNTIME ACTIVATED");

        return () => {
            ctx.logger.info("RUNTIME DISPOSED");
        };
    },
    testStep({ ctx }) {
        ctx.logger.info("TEST STEP");
    }
};
