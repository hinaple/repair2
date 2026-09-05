import type { Configuration } from "electron-builder";

export default async function (): Promise<Configuration> {
  return {
    appId: "com.repair2.app",
    productName: "repair2",
    directories: {
      buildResources: "build"
    },
    files: ["out/**/*", "assets/**/*"],
    extraFiles: ["templates/**/*", "packages/plugin-sdk/**/*"],
    asarUnpack: ["resources/**"],
    win: {
      executableName: "repair2",
      icon: "resources/logo.png"
    },
    electronLanguages: ["en-US"],
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
