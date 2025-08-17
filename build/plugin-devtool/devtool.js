import SveltePlugin from "./plugin/main.js";
import resourceUtils from "./resourceUtils.js";
customElements.define("repair-svelte-plugin", SveltePlugin);

globalThis.RepairUtils = { resources: resourceUtils };

const attributes = SveltePlugin.attributes ?? [];
const container = document.getElementById("component-container");
const propsState = {};
const configs = {
    width: {
        setter: (val) => {
            container.style.width = val ? `${val}px` : "auto";
        },
        type: "number",
        placeholder: "auto",
    },
    height: {
        setter: (val) => {
            container.style.height = val ? `${val}px` : "auto";
        },
        type: "number",
        placeholder: "auto",
    },
};
let pluginInstance = null;
function createPluginInstance() {
    if (pluginInstance) {
        container.removeChild(pluginInstance);
        pluginInstance = null;
    }
    pluginInstance = new SveltePlugin({
        attributes: { ...propsState },
        isDev: true,
    });
    container.appendChild(pluginInstance);
}
const propsPanel = document.getElementById("props-panel");
const propsHeader = document.getElementById("props-header");
propsHeader.addEventListener("click", () => {
    propsPanel.classList.toggle("collapsed");
});
function createPropInput(key) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = key;
    label.htmlFor = `input-${key}`;
    wrapper.appendChild(label);
    const input = document.createElement("input");
    input.autocomplete = "off";
    input.id = `input-${key}`;
    input.type = "text";
    input.value = propsState[key] ?? "";
    input.placeholder = "null";
    input.addEventListener("input", () => {
        const val = input.value.trim();
        if (val === "") {
            delete propsState[key];
        } else {
            propsState[key] = val;
        }
        createPluginInstance();
    });
    wrapper.appendChild(input);
    return wrapper;
}

function createConfigInput(
    key,
    { setter, type = "text", placeholder = null, defaultValue = null }
) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = key;
    label.htmlFor = `config-input-${key}`;
    wrapper.appendChild(label);
    const input = document.createElement("input");
    input.autocomplete = "off";
    input.id = `config-input-${key}`;
    input.type = type;
    let value = localStorage.getItem(`config_${key}`) ?? defaultValue ?? null;
    input.value = value;
    if (value !== null) setter(value);
    if (placeholder) input.placeholder = placeholder;
    input.addEventListener("input", () => {
        configs[key] = input.value;
        setter(input.value);
        localStorage.setItem(`config_${key}`, input.value);
    });
    wrapper.appendChild(input);
    return wrapper;
}
function initPropsPanel() {
    const content = document.getElementById("props-content");
    content.innerHTML = "";
    attributes.forEach((key) => {
        if (key != null) {
            content.appendChild(createPropInput(key));
        }
    });
    if (attributes.length) {
        const hr = document.createElement("hr");
        hr.style.border = "1px solid #444";
        content.appendChild(hr);
    }
    Object.entries(configs).forEach(([key, val]) => {
        content.appendChild(createConfigInput(key, val));
    });
    const hr = document.createElement("hr");
    hr.style.border = "1px solid #444";
    content.appendChild(hr);

    const btn = document.createElement("button");
    btn.innerText = "refresh";
    content.appendChild(btn);
    btn.addEventListener("click", () => {
        createPluginInstance();
    });
}
initPropsPanel();
createPluginInstance();
