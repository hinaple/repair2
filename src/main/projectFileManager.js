import { app, dialog, shell } from "electron";
import { emptyDir } from "fs-extra";
import { join } from "path";
import makeLog from "./logger";
import { createWriteStream } from "fs";
import archiver from "archiver";
import StreamZip from "node-stream-zip";
import { readdir } from "fs/promises";
import { closeSplash } from "./splash";

export default class ProjectFileManager {
    constructor(
        dataDir,
        {
            beforeImport = null,
            importProgress = null,
            afterImport = null,
            exportProgress = null,
            afterExport = null
        }
    ) {
        this.dataDir = dataDir;
        this.beforeImport = beforeImport;
        this.importProgress = importProgress;
        this.afterImport = afterImport;
        this.exportProgress = exportProgress;
        this.afterExport = afterExport;

        this.exporting = false;
        this.importing = false;
    }

    exportProject(projectName) {
        return new Promise(async (res, rej) => {
            const result = await dialog.showSaveDialog({
                title: "프로젝트 내보내기",
                defaultPath: join(app.getPath("documents"), `${projectName}.repair`),
                filters: [{ name: "REPAIRv2 Project", extensions: ["repair"] }]
            });
            if (!result || result.canceled) {
                res(false);
                return;
            }
            this.importing = true;

            const output = createWriteStream(result.filePath);
            const archive = archiver("zip", { zlip: { level: 0 } });
            output.on("close", () => {
                res(true);
                shell.showItemInFolder(result.filePath);
                this.importing = false;
                this.afterExport?.(result.filePath);
            });
            output.on("error", (err) => {
                rej(err);
                this.importing = false;
            });
            archive.pipe(output);

            archive.glob("**", {
                cwd: this.dataDir
            });
            archive.finalize();

            let fileCount = 0;
            archive.on("progress", (progress) => {
                this.exportProgress?.(
                    fileCount ? Math.floor((progress.entries.processed / fileCount) * 100) : null
                );
            });

            readdir(this.dataDir, { recursive: true }).then((files) => {
                fileCount = files.length;
            });
        });
    }

    importProject(filePath) {
        return new Promise(async (res, rej) => {
            try {
                this.importing = true;
                this.beforeImport?.();

                await emptyDir(this.dataDir);

                const zip = new StreamZip.async({ file: filePath, storeEntries: true });

                const totalEntrySize = Object.values(await zip.entries()).reduce(
                    (p, e) => p + e.size,
                    0
                );

                let proceedSize = 0;
                zip.on("extract", (entry, outPath) => {
                    proceedSize += entry.size;
                    this.importProgress?.(
                        `프로젝트 불러오는 중(${Math.floor((proceedSize / totalEntrySize) * 100)}%)\n[${outPath}]`
                    );
                });

                zip.on("error", (err) => {
                    rej(err);
                    importing = false;
                });

                await zip.extract(null, this.dataDir);
                await zip.close();

                this.importing = false;
                this.afterImport?.();
                res();
            } catch (error) {
                console.error(error);
                const logFile = await makeLog("error", JSON.stringify(error, null, 4));
                rej(error);
                closeSplash();
                await dialog.showMessageBox({
                    type: "error",
                    title: "프로젝트 불러오기",
                    message: "프로젝트를 불러오는 중 오류가 발생했습니다.",
                    detail: `에러 로그: ${logFile}`
                });
                app.quit();
            }
        });
    }

    async selectImportProject() {
        const confirm = await dialog.showMessageBox({
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
        const result = await dialog.showOpenDialog({
            title: "프로젝트 불러오기",
            properties: ["openFile"],
            filters: [{ name: "REPAIRv2 Project", extensions: ["repair"] }]
        });
        if (!result || result.canceled) return false;

        await this.importProject(result.filePaths[0]);
        return true;
    }
}
