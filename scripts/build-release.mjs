/* 打发布包。
 *
 *   node scripts/build-release.mjs
 *
 * 产出 dist/obsidian-workbench-kit-<版本>.zip，里面是用户真正要的东西：
 *   _wb/            整个组件库（拖进库根目录）
 *   工作台.md        开箱即用的首页笔记
 *   examples/       其他示例
 *   README.md       安装说明
 *
 * 刻意不打包 dev/、scripts/、testvault/ —— 那些是开发用的，塞进发布包
 * 只会让第一次上手的人困惑「这一堆我要不要管」。
 *
 * 版本号取自 _wb/view.js 里的 WB_VERSION，不另设一处 —— 两处版本号
 * 迟早会对不上。
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const version = (() => {
  const src = fs.readFileSync(path.join(ROOT, "vault", "_wb", "view.js"), "utf8");
  const m = src.match(/WB_VERSION\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("在 view.js 里找不到 WB_VERSION");
  return m[1];
})();

/* fs.cpSync 在部分 Windows + Node 24 组合下会把进程直接打崩
 * （0xC0000409，不留任何报错），所以自己递归复制 */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const DIST = path.join(ROOT, "dist");
const stage = path.join(DIST, `obsidian-workbench-kit-${version}`);
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

// ── 组装 ──
copyDir(path.join(ROOT, "vault", "_wb"), path.join(stage, "_wb"));
// 用户的布局不该跟着发布包走
fs.rmSync(path.join(stage, "_wb", "boards"), { recursive: true, force: true });

copyDir(path.join(ROOT, "examples"), path.join(stage, "examples"));
// 工作台放在最外层：解压后第一眼就该看到要打开哪个文件
fs.copyFileSync(path.join(ROOT, "examples", "工作台.md"), path.join(stage, "工作台.md"));

for (const f of ["README.md", "LICENSE", "CHANGELOG.md"]) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(stage, f));
}
copyDir(path.join(ROOT, "docs"), path.join(stage, "docs"));

// ── 压缩 ──
const zip = path.join(DIST, `obsidian-workbench-kit-${version}.zip`);
fs.rmSync(zip, { force: true });

if (os.platform() === "win32") {
  execFileSync("powershell", ["-NoProfile", "-Command",
    `Compress-Archive -Path '${stage}\\*' -DestinationPath '${zip}' -Force`], { stdio: "inherit" });
} else {
  execFileSync("zip", ["-rq", zip, path.basename(stage)], { cwd: DIST, stdio: "inherit" });
}

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);

console.log(`\n打包完成  v${version}`);
console.log(`  ${zip}`);
console.log(`  ${count(stage)} 个文件 · ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
