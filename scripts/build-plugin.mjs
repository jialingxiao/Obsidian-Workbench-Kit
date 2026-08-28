/* 打插件包。
 *
 *   node scripts/build-plugin.mjs
 *
 * 把 vault/_wb 下的内核、组件、主题、模板全部内联成一个 main.js，
 * 和 manifest.json 一起放进 dist/plugin/。
 *
 * 刻意不用 esbuild / rollup / npm：内核本来就是「读源码字符串再
 * new Function 求值」的结构，打包对它来说只是把文件内容换成一个对象
 * 字面量。为此装一整套 node_modules 不划算，也让别人 clone 下来就能
 * 直接构建 —— 不需要先跑 npm install。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WB = path.join(ROOT, "vault", "_wb");
const OUT = path.join(ROOT, "dist", "plugin");

/* ── 收集要打进去的资源 ── */
const assets = {};
const add = (rel) => {
  assets[rel.split(path.sep).join("/")] = fs.readFileSync(path.join(WB, rel), "utf8");
};

for (const f of fs.readdirSync(path.join(WB, "core"))) {
  // Dataview 版的数据层不打进插件 —— 插件用 query-native
  if (f === "query.js") continue;
  add(path.join("core", f));
}
for (const dir of fs.readdirSync(path.join(WB, "components"), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(WB, "components", dir.name))) {
    if (f.endsWith(".js") || f.endsWith(".css")) add(path.join("components", dir.name, f));
  }
}
for (const f of fs.readdirSync(path.join(WB, "themes"))) add(path.join("themes", f));
for (const f of fs.readdirSync(path.join(WB, "presets"))) add(path.join("presets", f));

/* ── 版本号 ──
 * 内核版本取自 view.js，插件版本取自 manifest.json —— 两者各自演进，
 * 但内核版本要透出到设置界面，方便排查「我到底跑的哪一版」。 */
const kernelVersion = fs
  .readFileSync(path.join(WB, "view.js"), "utf8")
  .match(/WB_VERSION\s*=\s*"([^"]+)"/)[1];

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin", "manifest.json"), "utf8"));
const shell = fs.readFileSync(path.join(ROOT, "plugin", "src", "main.js"), "utf8");

/* ── 组装 ──
 * 资源用 JSON.stringify 内联：源码里有反引号、${}、各种引号和中文，
 * 只有 JSON 字符串字面量能保证一律安全。 */
const banner = `/* Workbench Kit ${manifest.version} · 内核 ${kernelVersion}
 * 本文件由 scripts/build-plugin.mjs 生成，不要手改。
 * 组件与主题的源码内联在 WB_ASSETS 里，改动请改 vault/_wb/ 下的原文件。
 */
'use strict';

const obsidian = require('obsidian');
const WB_VERSION = ${JSON.stringify(kernelVersion)};
const WB_ASSETS = ${JSON.stringify(assets, null, 0)};

`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "main.js"), banner + shell, "utf8");
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

const size = fs.statSync(path.join(OUT, "main.js")).size;
console.log(`插件构建完成  v${manifest.version}（内核 ${kernelVersion}）`);
console.log(`  ${path.join(OUT, "main.js")}`);
console.log(`  ${Object.keys(assets).length} 个内联资源 · ${(size / 1024).toFixed(0)} KB`);
console.log(`\n安装到某个库：把 dist/plugin 整个复制成`);
console.log(`  <你的库>/.obsidian/plugins/${manifest.id}/`);
