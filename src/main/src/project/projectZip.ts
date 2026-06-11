import { ZipFile } from "yazl";
import { readdir, stat } from "fs/promises";
import { createReadStream, type WriteStream } from "fs";
import { relative, resolve } from "path";

export async function zip(
    projectDir: string,
    output: WriteStream,
    progressCb: (progress: number) => void
) {
    const zipFile = new ZipFile();
    zipFile.outputStream.pipe(output);

    const files = await readdir(projectDir, {
        encoding: "utf8",
        recursive: true,
        withFileTypes: true
    });
    let totalSize = 0,
        completedSize = 0;
    await Promise.all(
        files.map(async (d) => {
            const realPath = resolve(d.parentPath, d.name);
            const metaPath = relative(projectDir, realPath);
            if (d.isDirectory()) zipFile.addEmptyDirectory(metaPath);
            if (!d.isFile()) return;

            const s = await stat(realPath);
            totalSize += s.size;
            zipFile.addReadStreamLazy(
                metaPath,
                { mtime: s.mtime, mode: s.mode, size: s.size },
                (cb) => {
                    const rs = createReadStream(realPath);
                    rs.once("end", () => {
                        completedSize += s.size;
                        progressCb(completedSize / totalSize);
                    });
                    cb(null, rs);
                }
            );
        })
    );
    zipFile.end();
}
