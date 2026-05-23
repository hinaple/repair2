import { dialog, shell } from "electron";
import electronPrompt from "electron-prompt";
import fs from "fs/promises";
import { join } from "path";

const ENTRY_TYPE_MAP = {
    runtime: "runtime",
    "runtime-with-main": "runtime",
    element: "element",
    frame: "frame",
    function: "function",
    transition: "transition",
    "svelte-element": "element"
};

const DEFAULT_MANIFEST = {
    attr: []
};

const MANIFEST_ENTRIES = {
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
    }
};

function pluginNameValidate(name) {
    name = String(name)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    if (!name?.length) return { error: `${name} is invalid plugin name` };
    else return { name };
}

export async function createEmptyPlugin(
    name,
    entry,
    { link = false, root, templateDir, skipNameValidation }
) {
    const type = ENTRY_TYPE_MAP[entry];
    if (!type) return { error: `Unknown plugin type: ${entry}` };

    if (!skipNameValidation) {
        const validateResult = pluginNameValidate(name);
        if (validateResult.error) return validateResult;
        name = validateResult.name;
    }

    const targetDir = join(root, name);
    const alreadyExists = await fs
        .access(targetDir)
        .then(() => true)
        .catch(() => false);
    if (alreadyExists) return { error: `${targetDir} is already exists` };
    const pkg = {
        name
    };
    const manifest = { name, type, ...DEFAULT_MANIFEST, ...(MANIFEST_ENTRIES[entry] ?? {}) };
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(join(targetDir, "package.json"), JSON.stringify(pkg, null, 4), "utf8");
    await fs.writeFile(join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 4), "utf8");
    const pluginTemplateDir = join(templateDir, "plugin-scaffold");
    await fs.cp(join(pluginTemplateDir, "entries", entry), targetDir, { recursive: true });
    await fs.cp(join(pluginTemplateDir, "base"), targetDir, { recursive: true });
    console.log(`New ${entry} plugin created at: ${targetDir}.`);
    return { dir: targetDir };
}

export async function createPluginWithPrompt({
    parentWindow,
    pluginDir,
    templateDir,
    pluginLinkService
}) {
    let name = await electronPrompt(
        {
            title: "RepairV2",
            buttonLabels: { ok: "확인", cancel: "취소" },
            type: "input",
            inputAttrs: { type: "text", required: true },
            label: "플러그인 이름:"
        },
        parentWindow
    );
    if (!name) return;
    const validateResult = pluginNameValidate(name);
    if (validateResult.error) {
        dialog.showMessageBox(parentWindow, {
            message: "올바르지 않은 플러그인 이름",
            type: "error",
            detail: `"${name}"은 올바르지 않은 플러그인 이름 형식입니다.`
        });
        return;
    }
    name = validateResult.name;
    const entryType = await electronPrompt(
        {
            title: "RepairV2",
            buttonLabels: { ok: "확인", cancel: "취소" },
            type: "select",
            selectOptions: {
                runtime: "runtime",
                "runtime-with-main": "runtime(with main)",
                element: "element",
                frame: "frame",
                function: "function",
                transition: "transition",
                "svelte-element": "svelte element"
            },
            label: "플러그인 유형:"
        },
        parentWindow
    );
    if (!entryType) return;
    const result = await createEmptyPlugin(name, entryType, { root: pluginDir, templateDir });
    if (result.error) {
        dialog.showMessageBox(parentWindow, {
            message: "플러그인 생성 중 오류가 발생했습니다.",
            type: "error",
            detail: result.error
        });
        return;
    }
    shell.openPath(result.dir);
    return result.dir;
}
