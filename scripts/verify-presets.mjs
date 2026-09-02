/* 校验 vault/_wb/presets/*.json
 *
 *   node scripts/verify-presets.mjs
 *
 * 模板是手写的 JSON，引用着 51 个组件的 id 和它们各自的参数名 —— 写错
 * 一个字母不会报错，只会安静地渲染成空卡片或者用默认值。这里把三件事查掉：
 *   1. 组件 id 存在
 *   2. props 里的每个键都在该组件的 meta.props 里声明过
 *   3. 布局合法：不越界、不重叠
 * 主题名也顺带查一遍，写错了会静默回落到默认主题。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WB = path.join(ROOT, "vault", "_wb");
const COLS = 24;   // 栅格已细化，见 core/board.js 里 DEFAULT_BOARD 的注释

/* 组件源码是一个 (WB) => ({...}) 的表达式，直接求值拿 meta 最准 ——
   用正则去猜 props 有哪些键，正则本身就可能漏。 */
function loadMeta(id) {
  const src = fs.readFileSync(path.join(WB, "components", id, "component.js"), "utf8");
  const factory = new Function("return (" + src + ")")();
  return factory({}).meta;
}

const componentIds = fs.readdirSync(path.join(WB, "components"), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name);
const metas = new Map(componentIds.map((id) => [id, loadMeta(id)]));

/* 主题的中文名 / 拼音 id / 英文名三者等价，都收进来 */
const themeNames = new Set();
for (const f of fs.readdirSync(path.join(WB, "themes")).filter((f) => f.endsWith(".css"))) {
  const css = fs.readFileSync(path.join(WB, "themes", f), "utf8");
  themeNames.add(f.replace(/\.css$/, ""));
  for (const k of ["name", "en"]) {
    const m = css.match(new RegExp("@" + k + "[ \t]+(.+)"));
    if (m) themeNames.add(m[1].trim());
  }
}

const problems = [];
const dir = path.join(WB, "presets");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

for (const f of files) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const say = (msg) => problems.push(`${f}  ${msg}`);

  if (!p.name?.zh || !p.name?.en) say("缺 name.zh / name.en");
  if (!p.desc?.zh || !p.desc?.en) say("缺 desc.zh / desc.en");
  if (p.theme && !themeNames.has(p.theme)) say(`主题「${p.theme}」不存在`);

  const placed = [];
  for (const b of p.blocks || []) {
    const meta = metas.get(b.c);
    if (!meta) { say(`组件「${b.c}」不存在`); continue; }

    for (const k of Object.keys(b.props || {})) {
      if (!(k in (meta.props || {}))) say(`${b.c} 的参数「${k}」未在 meta.props 里声明`);
    }

    const { x, y, w, h } = b;
    if ([x, y, w, h].some((v) => !Number.isInteger(v))) { say(`${b.c} 的 x/y/w/h 不是整数`); continue; }
    if (x < 0 || w < 1 || x + w > COLS) say(`${b.c} 越界：x=${x} w=${w}（共 ${COLS} 列）`);
    if (h < 1) say(`${b.c} 的高度非法：h=${h}`);

    for (const o of placed) {
      const hit = x < o.x + o.w && o.x < x + w && y < o.y + o.h && o.y < y + h;
      if (hit) say(`${b.c}(${x},${y},${w},${h}) 与 ${o.c}(${o.x},${o.y},${o.w},${o.h}) 重叠`);
    }
    placed.push(b);
  }

  const rows = placed.reduce((m, b) => Math.max(m, b.y + b.h), 0);
  console.log(`  ${f.padEnd(16)} ${String(p.name.zh).padEnd(6)} ${String(p.theme || "（默认）").padEnd(8)} ${String(placed.length).padStart(2)} 块 · ${rows} 行`);
}

console.log("");
if (problems.length) {
  for (const m of problems) console.log("  !! " + m);
  console.log(`\n${files.length} 套模板，${problems.length} 处问题`);
  process.exit(1);
}
console.log(`${files.length} 套模板全部通过`);
