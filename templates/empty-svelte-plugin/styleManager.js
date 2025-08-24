export function mountCss(pluginName, cssObj, shadowRoot) {
    if (!cssObj) return;
    cssObj.forEach((cssArr, where) => {
        if (!cssArr) return;
        cssArr.forEach(({ css, attributes }) => {
            const style = document.createElement("style");
            style.dataset.pluginName = pluginName;

            if (attributes)
                Object.entries(attributes).forEach(([key, value]) => {
                    style.setAttribute(key, value);
                });

            style.appendChild(document.createTextNode(css));
            (where === 0 ? shadowRoot : document.head).appendChild(style);
        });
    });
}

export function destroyCss(pluginName) {
    document
        .querySelectorAll(`style[data-plugin-name=${pluginName}]`)
        .forEach((s) => s.parentNode.removeChild(s));
}
