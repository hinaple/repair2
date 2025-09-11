import { app, dialog, shell } from "electron";
import { emptyDir } from "fs-extra";
import { join } from "path";
import makeLog from "./logger";
import { createWriteStream } from "fs";
import archiver from "archiver";
import StreamZip from "node-stream-zip";

export default class ProjectFileManager {
    constructor(dataDir, { beforeImport = null, importProgress = null, afterImport = null }) {
        this.dataDir = dataDir;
        this.beforeImport = beforeImport;
        this.importProgress = importProgress;
        this.afterImport = afterImport;

        this.exporting = false;
        this.importing = false;
    }

    exportProject(projectName) {
        return new Promise(async (res, rej) => {
            this.importing = true;
            const result = await dialog.showSaveDialog({
                title: "프로젝트 내보내기",
                defaultPath: join(app.getPath("documents"), `${projectName}.repair`),
                filters: [{ name: "REPAIRv2 Project", extensions: ["repair"] }]
            });
            if (!result || result.canceled) res(false);

            const output = createWriteStream(result.filePath);
            const archive = archiver("zip", { zlip: { level: 0 } });
            output.on("close", () => {
                res(true);
                shell.showItemInFolder(result.filePath);
                this.importing = false;
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

            archive.on("progress", (progress) => {
                console.log(
                    "PROGRESS",
                    Math.floor((progress.fs.processedBytes / progress.fs.totalBytes) * 100)
                );
            });
            // const zip = new admZip();
            // zip.addLocalFolder(this.dataDir, "", (filename) => {
            //     const dirs = filename.split(/\\|\//);
            //     return !(
            //         dirs.includes("svelte-plugins") &&
            //         (dirs.includes("node_modules") || dirs.includes("dist"))
            //     );
            // });
            // zip.writeZip(result.filePath);

            // res(true);
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
                    console.log(
                        "IMPORT PROGRESS",
                        Math.floor((proceedSize / totalEntrySize) * 100)
                    );
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

                // const zip = new admZip(filePath);
                // zip.extractAllTo(this.dataDir, true);
            } catch (error) {
                console.error(error);
                const logFile = await makeLog("error", JSON.stringify(error, null, 4));
                await dialog.showMessageBox({
                    type: "error",
                    title: "프로젝트 불러오기",
                    message: "프로젝트를 불러오는 중 오류가 발생했습니다.",
                    detail: `에러 로그: ${logFile}`
                });
                rej(error);
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
