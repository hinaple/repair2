import { mount } from "svelte";

import "./global.css";
import "tippy.js/dist/tippy.css";
import "./tippy.css";
import "./sidebar/resizer/resizer.css";

import App from "./App.svelte";

const app = mount(App, {
    target: document.getElementById("app")
});

export default app;
