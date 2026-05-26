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
