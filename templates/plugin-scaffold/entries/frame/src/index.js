/** @type {import("@fainthit/repair2-plugin-sdk").FrameExport} */
export default function mount({ attributes, ctx }, { target, children, showIntro }) {
    const div = document.createElement("div");
    div.setAttribute("style", "background-color: #222; padding: 20px;");
    div.append(children);
    target.append(div);

    return () => {
        div.remove();
    };
}
