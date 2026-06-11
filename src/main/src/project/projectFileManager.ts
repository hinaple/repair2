import { emptyDir } from "fs-extra";
import { createWriteStream } from "fs";
import { logger } from "../logs/logger";
import type { MainApp } from "../app/mainApp";

type ProjectFileManagerOptions = {
    beforeImport?: (() => Promise<unknown> | unknown) | null;
    importProgress?: ((message: string) => void) | null;
    afterImport?: (() => Promise<unknown> | unknown) | null;
    exportProgress?: ((progress: number | null) => void) | null;
    afterExport?: ((filePath: string) => void) | null;
};

type ZipEntry = {
    size: number;
};

type ZipWithErrorEvent = {
    on(event: "error", handler: (err: unknown) => void): void;
};

export default class ProjectFileManager {
    exporting = false;
    importing = false;

    #app: MainApp;
    #afterExport: ((filePath: string) => void) | null;
    #afterImport: (() => Promise<unknown> | unknown) | null;
    #beforeImport: (() => Promise<unknown> | unknown) | null;
    #exportProgress: ((progress: number | null) => void) | null;
    #importProgress: ((message: string) => void) | null;

    constructor(
        app: MainApp,
        {
            beforeImport = null,
            importProgress = null,
            afterImport = null,
            exportProgress = null,
            afterExport = null
        }: ProjectFileManagerOptions
    ) {
        this.#app = app;
        this.#beforeImport = beforeImport;
        this.#importProgress = importProgress;
        this.#afterImport = afterImport;
        this.#exportProgress = exportProgress;
        this.#afterExport = afterExport;
    }

    async exportProject(projectName: string) {
        const result = await this.#app.system.dialog.showSaveDialog({
            title: "프로젝트 내보내기",
            defaultPath: `${projectName}.repair`,
            filters: [{ name: "REPAIRv2 Project", extensions: ["repair"] }]
        });
        if (!result || result.canceled || !result.filePath) return false;

        this.importing = true;

        const { zip } = await import("./projectZip");
        return new Promise<boolean>((resolve, reject) => {
            const output = createWriteStream(result.filePath!);
            output.on("close", () => {
                resolve(true);
                this.#app.system.shell.showItemInFolder(result.filePath!);
                this.importing = false;
                this.#afterExport?.(result.filePath!);
            });
            output.on("error", (err) => {
                reject(err);
                this.importing = false;
            });

            zip(this.#app.paths.dataDir, output, (progress) =>
                this.#exportProgress?.(Math.floor(progress * 100))
            );
        });
    }

    async importProject(filePath: string) {
        try {
            this.importing = true;
            await this.#beforeImport?.();

            await emptyDir(this.#app.paths.dataDir);

            const zip = new (await import("node-stream-zip")).async({
                file: filePath,
                storeEntries: true
            });

            const entries = Object.values((await zip.entries()) as Record<string, ZipEntry>);
            const totalEntrySize = entries.reduce((previous, entry) => previous + entry.size, 0);

            let proceedSize = 0;
            zip.on("extract", (entry: ZipEntry, outPath: string) => {
                proceedSize += entry.size;
                this.#importProgress?.(
                    `프로젝트 불러오는 중(${Math.floor((proceedSize / totalEntrySize) * 100)}%)\n[${outPath}]`
                );
            });

            await new Promise<void>((resolve, reject) => {
                (zip as unknown as ZipWithErrorEvent).on("error", (err: unknown) => {
                    this.importing = false;
                    reject(err);
                });
                zip.extract(null, this.#app.paths.dataDir).then(() => resolve(), reject);
            });
            await zip.close();

            await this.#afterImport?.();
            this.importing = false;
        } catch (error) {
            this.importing = false;
            this.#app.startup.closeSplash();
            logger
                .with({
                    source: "project",
                    type: "project-import-error",
                    phase: "import",
                    subject: { kind: "project" },
                    dialog: true
                })
                .error("프로젝트를 불러오는 중 오류가 발생했습니다.", ...(error ? [error] : []));
            this.#app.system.app.quit();
            throw error;
        }
    }

    async selectImportProject() {
        const confirm = await this.#app.system.dialog.showMessageBox({
            type: "info",
            title: "프로젝트 불러오기",
            message: "프로젝트 파일을 불러올까요?",
            detail: "편집 중이던 프로젝트의 정보가 삭제됩니다.",
            buttons: ["확인", "취소"],
            cancelId: 1,
            defaultId: 0,
            noLink: true
        });
        if (confirm.response !== 0) return false;

        const result = await await this.#app.system.dialog.showOpenDialog({
            title: "프로젝트 불러오기",
            properties: ["openFile"],
            filters: [{ name: "REPAIRv2 Project", extensions: ["repair"] }]
        });
        if (!result || result.canceled) return false;

        await this.importProject(result.filePaths[0]);
        return true;
    }
}
