import admZip from "adm-zip";
import { app, dialog, shell } from "electron";
import { emptyDir } from "fs-extra";
import { join } from "path";

export default class ProjectFileManager {
    constructor(dataDir, beforeImport = null) {
        this.dataDir = dataDir;
        this.beforeImport = beforeImport;
    }

    async exportProject(projectName) {
        const result = await dialog.showSaveDialog({
            title: "프로젝트 내보내기",
            defaultPath: join(app.getPath("documents"), `${projectName}.repair`),
            filters: [{ name: "REPAIRv2 Project", extensions: ["repair"] }]
        });
        if (!result || result.canceled) return false;

        const zip = new admZip();
        zip.addLocalFolder(this.dataDir, "");
        zip.writeZip(result.filePath);

        return true;

        shell.showItemInFolder(result.filePath);
    }

    async importProject(filePath) {
        try {
            this.beforeImport?.();

            await emptyDir(this.dataDir);

            const zip = new admZip(filePath);
            zip.extractAllTo(this.dataDir, true);
        } catch (error) {
            console.error(error);
            await dialog.showMessageBox({
                type: "error",
                title: "프로젝트 불러오기",
                message: "프로젝트를 불러오는 중 오류가 발생했습니다."
            });
            app.quit();
        }
    }

    async selectImportProject() {
        const confirm = await dialog.showMessageBox({
            type: "info",
            title: "프로젝트 불러오기",
            message: "프로젝트 파일을 불러올까요?",
            detail: "편집 중이던 프로젝트의 정보가 삭제됩니다.",
            buttons: ["취소", "확인"]
        });
        if (confirm.response !== 1) return;
        const result = await dialog.showOpenDialog({
            title: "프로젝트 불러오기",
            properties: ["openFile"],
            filters: [{ name: "REPAIRv2 Project", extensions: ["repair"] }]
        });
        if (!result || result.canceled) return;

        await this.importProject(result.filePaths[0]);
    }
}
