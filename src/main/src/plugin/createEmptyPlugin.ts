import fs from "fs/promises";
import { join } from "path";
import { pluginDir, sdkDir, templateDir } from "../system/dirs";
import { pathExists } from "../system/pathExists";
import type { RawManifest } from "./type";
import { logger } from "../logs/logger";
import { toKebabCase } from "@shared/stringUtils";

declare const __SDK_VERSION__: string;
declare const __SVELTE_VERSION__: string;
declare const __TS_VERSION__: string;

const PLUGIN_SDK_VERSION = __SDK_VERSION__;
const SDK_NAME = "@fainthit/repair2-plugin-sdk";
const SCHEMA_PATH = `./node_modules/${SDK_NAME}/plugin-manifest.schema.json`;

const ENTRY_TYPE_MAP = {
  runtime: "runtime",
  "runtime-with-main": "runtime",
  element: "element",
  frame: "frame",
  function: "function",
  transition: "transition",
  "svelte-element": "element",
  "svelte-frame": "frame"
} as const;

export type PLUGIN_ENTRY_TYPE = keyof typeof ENTRY_TYPE_MAP;

const DEFAULT_MANIFEST = {
  attributes: []
};

const MANIFEST_ENTRIES: Partial<Record<PLUGIN_ENTRY_TYPE, { [key: string]: any }>> = {
  runtime: {
    steps: {}
  },
  "runtime-with-main": {
    main: {
      entry: "src/main/index.js",
      outDir: "dist/main"
    },
    entry: "src/renderer/index.js",
    outDir: "dist/renderer",
    steps: { testStep: ["arg"] }
  },
  "svelte-element": {
    svelte: true
  },
  "svelte-frame": {
    svelte: true
  }
};

const TS_MANIFEST_ENTRIES: Partial<Record<PLUGIN_ENTRY_TYPE, { [key: string]: any }>> = {
  "runtime-with-main": {
    main: {
      entry: "src/main/index.ts",
      outDir: "dist/main"
    },
    entry: "src/renderer/index.ts"
  }
};

function pluginNameValidate(name: string): { error: string } | { name: string } {
  name = toKebabCase(name);
  if (!name?.length) return { error: `${name} is invalid plugin name` };
  else return { name };
}

function createTsConfig(svelte: boolean) {
  return {
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "Bundler",
      lib: ["ESNext", "DOM", "DOM.Iterable"],
      strict: true,
      noEmit: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      skipLibCheck: true
    },
    include: svelte ? ["src/**/*.ts", "src/**/*.svelte"] : ["src/**/*.ts"]
  };
}

export async function createEmptyPlugin(
  name: string,
  entry: PLUGIN_ENTRY_TYPE,
  {
    root,
    templatePath = templateDir,
    skipNameValidation = false,
    typescript = false
  }: {
    root?: string;
    templatePath?: string;
    skipNameValidation?: boolean;
    typescript?: boolean;
  }
): Promise<{ error: string } | { dir: string }> {
  const type = ENTRY_TYPE_MAP[entry];
  if (!type) return { error: `Unknown plugin type: ${entry}` };

  if (!skipNameValidation) {
    const validateResult = pluginNameValidate(name);
    if ("error" in validateResult) return validateResult;
    name = validateResult.name;
  }

  const targetDir = join(root ?? pluginDir, name);
  const alreadyExists = await pathExists(targetDir);
  if (alreadyExists) return { error: `${targetDir} is already exists` };
  const manifest: RawManifest & { $schema: string } = {
    $schema: SCHEMA_PATH,
    name,
    type,
    ...DEFAULT_MANIFEST,
    ...(typescript ? { entry: "src/index.ts" } : {}),
    ...(MANIFEST_ENTRIES[entry] ?? {}),
    ...(typescript ? (TS_MANIFEST_ENTRIES[entry] ?? {}) : {})
  };
  const pkg = {
    name,
    type: "module",
    devDependencies: {
      [SDK_NAME]: PLUGIN_SDK_VERSION,
      ...(typescript ? { typescript: __TS_VERSION__ } : null),
      ...(manifest.svelte ? { svelte: __SVELTE_VERSION__ } : null)
    }
  };
  await fs.mkdir(targetDir, { recursive: true });
  const pluginTemplateDir = join(templatePath, "plugin-scaffold");
  await Promise.all([
    fs.writeFile(join(targetDir, "package.json"), JSON.stringify(pkg, null, 2), "utf8"),
    fs.writeFile(join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8"),
    fs.cp(
      join(pluginTemplateDir, typescript ? "entries/typescript" : "entries", entry),
      targetDir,
      { recursive: true }
    ),
    fs.cp(join(pluginTemplateDir, "base"), targetDir, { recursive: true }),
    ...(manifest.svelte
      ? [fs.cp(join(pluginTemplateDir, "common/svelte"), targetDir, { recursive: true })]
      : []),
    copyModule(targetDir, SDK_NAME),
    ...(typescript
      ? [
          fs.writeFile(
            join(targetDir, "tsconfig.json"),
            JSON.stringify(createTsConfig(!!manifest.svelte), null, 2),
            "utf8"
          )
        ]
      : [])
  ]);
  logger.info(`"${entry}" plugin created at: `, targetDir);
  return { dir: targetDir };
}

function copyModule(targetDir: string, module: string) {
  return fs.cp(sdkDir, join(targetDir, "node_modules", module), {
    recursive: true
  });
}
