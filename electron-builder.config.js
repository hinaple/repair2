import fs from "fs/promises";
import { join, resolve } from "path";

/**
 * @return {Promise<import("electron-builder").Configuration>}
 */
export default async function (...attr) {
    const viteDependencies = Object.keys(
        JSON.parse(await fs.readFile(resolve("node_modules/vite/package.json"), "utf8"))
            .dependencies
    );
    const asarUnpackModules = [];
    await Promise.all(
        viteDependencies.map((d) =>
            fs
                .access(join("node_modules", d))
                .then(() => asarUnpackModules.push(d))
                .catch(() => {})
        )
    );

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
        asarUnpack: [
            "resources/**",
            "node_modules/vite/**",
            ...asarUnpackModules.map((m) => `node_modules/${m}/**`)
        ],
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
