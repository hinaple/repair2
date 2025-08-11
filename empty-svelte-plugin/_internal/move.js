import fs from "fs";
import path from "path";

const pluginDir = path.resolve(".");
const pkgPath = path.join(pluginDir, "package.json");

if (!fs.existsSync(pkgPath)) {
    console.error("package.json missing");
    process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const pluginName = pkg.name;

const distFile = path.resolve(`./dist/plugin.js`);
const targetFile = path.resolve(`../../elements/${pluginName}.js`);

if (!fs.existsSync(distFile)) {
    console.error(`${distFile} doesn't exist`);
    process.exit(1);
}

fs.copyFileSync(distFile, targetFile);
console.log(`✅ ${distFile} was cloned to ${targetFile}`);
