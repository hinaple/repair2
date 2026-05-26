import "./component.css";

import { mount, unmount } from "svelte";
import Component from "./Component.svelte";

export default class SvelteElement extends HTMLElement {
    /**
     * @param {{
     *     attributes?: Record<string, unknown>,
     *     isDev?: boolean,
     *     ctx?: RepairElementPluginContext | null
     * }} options
     */
    constructor({ attributes = {}, isDev = false, ctx = null }) {
        super();
        this.attributesObj = { ...attributes, ctx, isDev };
    }

    connectedCallback() {
        if (this.component) return;

        const children = document.createDocumentFragment();
        children.append(...Array.from(this.childNodes));

        this.component = mount(Component, {
            target: this,
            props: {
                ...this.attributesObj,
                root: this,
                slot(node) {
                    node.append(children);
                    return {
                        destroy() {
                            children.append(...Array.from(node.childNodes));
                        }
                    };
                }
            }
        });

        this.ctx?.lifecycle?.onDispose?.(() => this.dispose());
    }

    disconnectedCallback() {
        this.dispose();
    }
    dispose() {
        if (!this.component) return;
        unmount(this.component);
        this.component = null;
    }
}
