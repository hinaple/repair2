import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],

        define: {
            __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
        }
    }
});
