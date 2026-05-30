/** @type {import("@fainthit/repair2-plugin-sdk").ElementExport} */
export default function mount({ attributes, ctx }, { target, dispatchEvent }) {
    const div = document.createElement("div");
    div.setAttribute(
        "style",
        "width: 100%; height: 100%; background-color: #222; font-size: 50px; color: #fff;"
    );
    div.textContent = "Hello, world!";
    target.append(div);

    const clickHandler = () => dispatchEvent("click");
    div.addEventListener("click", clickHandler);

    return () => {
        div.removeEventListener("click", clickHandler);
    };
}
