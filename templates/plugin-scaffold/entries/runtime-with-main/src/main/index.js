// @ts-check

/** @typedef {Record<string, (...args: unknown[]) => unknown>} MainMethods */
/** @typedef {Record<string, (...args: unknown[]) => void>} RendererMethods */

/** @returns {import("@fainthit/repair2-plugin-sdk").RuntimeMain<Record<string, unknown>, MainMethods, RendererMethods>} */
export default function () {
    let r = null;
    return {
        activate({ ctx, attributes, renderer }) {
            console.log("MAIN ACTIVATED");
            r = renderer;
            return () => {
                console.log("DISPOSED");
            };
        },
        main: {
            foo(str) {
                r.bar(str);
            }
        }
    };
}
