import { ipcRenderer } from "electron";

class PluginPackageLoader {
    constructor() {
        this.packages = new Map();
    }

    async require(packageName, version = "latest") {
        try {
            if (this.packages.has(packageName)) {
                return this.packages.get(packageName);
            }

            const installResult = await ipcRenderer.invoke("plugin:install-package", {
                name: packageName,
                version
            });

            if (!installResult.success) {
                throw new Error(`Failed to install ${packageName}: ${installResult.error}`);
            }

            const { packageInfo } = installResult;
            console.log("Loading package from:", packageInfo.path);

            const module = await import(/* @vite-ignore */ packageInfo.path);
            const exportedModule = module.default || module;

            console.log("Loaded package successfully");
            this.packages.set(packageName, exportedModule);
            return exportedModule;
        } catch (error) {
            console.error(`Failed to load package ${packageName}:`, error);
            throw error;
        }
    }
}

export const packageLoader = new PluginPackageLoader();
