/** @typedef {Record<string, (...args: unknown[]) => Promise<unknown>>} MainMethods */
/** @typedef {Record<string, (...args: unknown[]) => void>} RendererMethods */

/** @type {import("@fainthit/repair2-plugin-sdk").RuntimeFactory<Record<string, unknown>, MainMethods, RendererMethods>} */
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
