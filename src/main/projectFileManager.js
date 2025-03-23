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
        if (!result || result.canceled) return;

        const zip = new admZip();
        zip.addLocalFolder(this.dataDir, "");
        zip.writeZip(result.filePath);

        shell.showItemInFolder(result.filePath);
    }

    async importProject(filePath) {
        this?.beforeImport?.();

        await emptyDir(this.dataDir);

        const zip = new admZip(filePath);
        zip.extractAllTo(this.dataDir, true);
    }

    async selectImportProject() {
        const confirm = await dialog.showMessageBox({
            type: "warning",
            title: "프로젝트 파일을 불러올까요?",
            message: "편집 중이던 프로젝트의 정보가 삭제됩니다.",
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
