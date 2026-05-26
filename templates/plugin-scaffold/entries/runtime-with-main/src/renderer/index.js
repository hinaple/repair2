export default () => {
    let ctx, attr, main;
    return {
        activate(opt) {
            ctx = opt.ctx;
            main = opt.main;
            attr = opt.attributes;

            ctx.logger.info("RUNTIME ACTIVATED");
        },
        testStep({ ctx, attributes }) {
            ctx.logger.info(`SENDING: ${attributes.str}`);
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
