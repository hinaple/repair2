import { ipcRenderer } from "electron";

export async function requirePackage(packageName, version = "latest") {
    try {
        const installResult = await ipcRenderer.invoke("plugin:install-package", {
            name: packageName,
            version
        });

        if (!installResult.success) {
            throw new Error(`Failed to install ${packageName}: ${installResult.error}`);
        }

        const { packageInfo } = installResult;
        console.log("Loading package from:", packageInfo.path);

        const module = packageInfo.isESM
            ? await import(/* @vite-ignore */ packageInfo.path)
            : require(packageInfo.path);
        const exportedModule = module.default || module;

        console.log("Loaded package successfully");
        return exportedModule;
    } catch (error) {
        console.error(`Failed to load package ${packageName}:`, error);
        throw error;
    }
}
