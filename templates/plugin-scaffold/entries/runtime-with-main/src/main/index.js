export default function () {
    let r = null;
    return {
        activate({ ctx, attributes, renderer }) {
            console.log("MAIN ACTIVATED");
            r = renderer;
        },
        main: {
            foo(str) {
                r.bar(str);
            }
        },
        dispose() {
            console.log("DISPOSED");
        }
    };
}
