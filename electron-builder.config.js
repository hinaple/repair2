import fs from "fs/promises";
import { join, resolve } from "path";

// async function getViteDependenciesDeps(modules = new Set(), currentModule = "vite") {
//     try {
//         if (modules.has(currentModule)) return;
//         modules.add(currentModule);

//         const currentDependencies = Object.keys(
//             JSON.parse(
//                 await fs.readFile(join("node_modules", currentModule, "package.json"), "utf8")
//             ).dependencies
//         );
//         await Promise.all(
//             currentDependencies.map((module) => getViteDependenciesDeps(modules, module))
//         );
//         return modules;
//     } catch {}
// }

/**
 * @return {Promise<import("electron-builder").Configuration>}
 */
export default async function (...attr) {
    return {
        appId: "com.repair2.app",
        productName: "repair2",
        directories: {
            buildResources: "build"
        },
        extraFiles: ["templates/**/*", "packages/**/*"],
        files: [
            "!**/.vscode/*",
            "!src/*",
            "!*.config.{js,ts,mjs,cjs}",
            "!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}",
            "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
            "!*.md",
            "!docs/*",
            "!packages/*",
            "!templates/*",
            "!vitePlugins/*"
        ],
        asarUnpack: ["resources/**"],
        win: {
            executableName: "repair2",
            icon: "resources/logo.png"
        },
        nsis: {
            artifactName: "${name}-${version}-setup.${ext}",
            shortcutName: "${productName}",
            uninstallDisplayName: "${productName}",
            createDesktopShortcut: "always",
            perMachine: true,
            oneClick: false,
            allowToChangeInstallationDirectory: true
        },
        linux: {
            target: ["AppImage", "snap", "deb"],
            maintainer: "electronjs.org",
            category: "Utility"
        },
        appImage: {
            artifactName: "${name}-${version}.${ext}"
        },
        npmRebuild: false,
        fileAssociations: [
            {
                ext: "repair",
                description: "Repair v2 Project",
                name: "Repair v2 Project",
                icon: "resources/project.png"
            }
        ]
    };
}
