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
