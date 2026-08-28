/* 从源码生成参考文档。
 *
 *   node scripts/gen-docs.mjs
 *
 * 组件的参数表直接从 meta.props 读出来 —— 这正是那套 schema 的意义：
 * 一份定义同时驱动运行时默认值、⚙ 设置表单和这里的文档，不写第二遍。
 * 手写文档必然和代码漂移，这是迟早的事。
 *
 * Node 在 Windows 上无法从含非 ASCII 字符的路径启动脚本（报 exit 9），
 * 所以留了 WB_ROOT 逃生口：把脚本复制到 ASCII 路径下跑，用 WB_ROOT
 * 指回真正的仓库位置。fs 读写中文路径本身没问题。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WB = path.join(ROOT, "vault", "_wb");
const DOCS = path.join(ROOT, "docs");

/* ── 组件：用和运行时一样的方式求值，保证读到的就是真 meta ── */
const stub = {
  dom: { h: () => ({}), link: () => ({}), frag: () => ({}), clear: () => {}, append: () => {} },
  i18n: { t: (s) => s, pick: (v) => (typeof v === "string" ? v : v?.zh ?? ""), locale: () => "zh" },
  config: { data: { paths: {}, tokens: {} }, path: (p) => p, token: (v) => v },
  query: {}, ui: { GROUPS: [] }, runtime: {}, app: {},
};

function loadMeta(id) {
  const src = fs.readFileSync(path.join(WB, "components", id, "component.js"), "utf8");
  const factory = new Function(`"use strict"; return (${src});`)();
  return factory(stub).meta || {};
}

const GROUPS = [
  ["header", "页头"],
  ["nav", "导航入口"],
  ["metrics", "数据统计"],
  ["notes", "笔记流"],
  ["tasks", "任务与计划"],
  ["layout", "版面元素"],
];

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const zh = (v) => (typeof v === "string" ? v : v?.zh ?? v?.en ?? "");

/* 输出 JS 字面量而不是 JSON：文档里的示例是给人直接抄进 dataviewjs 的，
   带引号的键名（"c": "banner"）不是那个语境下会写的样子。 */
function jsLit(v, indent = 0) {
  const pad = "  ".repeat(indent + 1);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return `[\n${v.map((x) => pad + jsLit(x, indent + 1)).join(",\n")}\n${"  ".repeat(indent)}]`;
  }
  if (v && typeof v === "object") {
    const keys = Object.keys(v);
    if (!keys.length) return "{}";
    const body = keys
      .map((k) => `${pad}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${jsLit(v[k], indent + 1)}`)
      .join(",\n");
    return `{\n${body}\n${"  ".repeat(indent)}}`;
  }
  return JSON.stringify(v);
}

function fmtDefault(d) {
  if (d === undefined) return "—";
  if (d === "") return "`\"\"`（空）";
  if (Array.isArray(d)) return d.length ? "`" + JSON.stringify(d) + "`" : "`[]`";
  if (d === null) return "`null`";
  if (typeof d === "object") return "`" + JSON.stringify(d) + "`";
  return "`" + JSON.stringify(d) + "`";
}

// ── components.md ──
const ids = fs.readdirSync(path.join(WB, "components"), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort();

const metas = ids.map((id) => ({ id, meta: loadMeta(id) }));

let md = `# 组件参考

> 本文件由 \`scripts/gen-docs.mjs\` 从各组件的 \`meta\` 自动生成，**不要手改**。
> 共 ${ids.length} 个组件，分 ${GROUPS.length} 类。

调用方式：

\`\`\`js
await dv.view("_wb", { c: "组件名", 参数: 值 })
\`\`\`

看板模式下也可以直接在「＋ 组件」面板里挑，参数用 ⚙ 表单改。

`;

for (const [gid, gname] of GROUPS) {
  const inGroup = metas.filter((m) => m.meta.group === gid);
  if (!inGroup.length) continue;
  md += `\n## ${gname}\n`;
  for (const { id, meta } of inGroup) {
    const lay = meta.layout || {};
    md += `\n### \`${id}\` · ${zh(meta.name)}\n\n${zh(meta.desc)}\n\n`;
    md += `默认格子：${lay.w || 6} 列 × ${lay.h || 5} 行（加进看板后会按实际内容自动定高）\n\n`;

    const props = Object.entries(meta.props || {});
    if (!props.length) {
      md += `_没有可调参数。_\n`;
      continue;
    }
    md += `| 参数 | 类型 | 默认值 | 说明 |\n|---|---|---|---|\n`;
    for (const [key, d] of props) {
      const type = d.options ? d.options.map((o) => `\`${o}\``).join(" / ") : `\`${d.type || "text"}\``;
      md += `| \`${key}\` | ${type} | ${fmtDefault(d.default)} | ${esc(zh(d.desc))} |\n`;
    }
    if (meta.demo && Object.keys(meta.demo).length) {
      md += `\n<details><summary>示例</summary>\n\n\`\`\`js\nawait dv.view("_wb", ${jsLit({ c: id, ...meta.demo })})\n\`\`\`\n\n</details>\n`;
    }
  }
}

// ── themes.md ──
const themeFiles = fs.readdirSync(path.join(WB, "themes")).filter((f) => f.endsWith(".css")).sort();
const themeMeta = themeFiles.map((f) => {
  const css = fs.readFileSync(path.join(WB, "themes", f), "utf8");
  const get = (k, d = "") => (css.match(new RegExp("@" + k + "[ \\t]+([^\\n\\r]+)")) || [, d])[1].trim();
  return {
    id: f.replace(/\.css$/, ""),
    name: get("name"), en: get("en"), desc: get("desc"), font: get("font"),
    swatch: get("swatch").split(/\s+/).filter(Boolean),
    /* 认选择器不认字符串：松烟的注释里写着「没有 .theme-dark 覆写」，
       按 includes 匹配会把它判成有覆写。 */
    hasDarkOverride: /\.theme-dark\s+\.wb/.test(css),
  };
});

/* 「没有深色覆写」不等于「认定深色」—— 绀宇就是一套没写深色覆写的浅色主题。
   得看底色本身的明暗，@swatch 的第一个值就是底色。 */
function relLum(hex) {
  const h = String(hex).replace("#", "");
  if (h.length !== 6) return null;                     // 素笺是 var(...)，量不了
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = [0, 2, 4].map((i) => f(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
for (const t of themeMeta) {
  const l = relLum(t.swatch[0]);
  t.mode = t.hasDarkOverride ? "跟随明暗"
    : l == null ? "跟随明暗"
    : l < 0.15 ? "认定深色" : "只有浅色";
}

let tmd = `# 主题参考

> 本文件由 \`scripts/gen-docs.mjs\` 从各主题 CSS 的头部注释自动生成，**不要手改**。
> 配色本身由 \`scripts/gen-themes.py\` 生成 —— 改配色请改那个脚本。

主题名在 \`config.json\`、frontmatter \`wbTheme\` 和模板里都可以写中文名、拼音 id 或英文名，三者等价。

| 名称 | id | 英文名 | 气质 | 字体 | 深色 |
|---|---|---|---|---|---|
`;
for (const t of themeMeta) {
  tmd += `| **${t.name}** | \`${t.id}\` | ${t.en} | ${esc(t.desc)} | ${t.font} | ${t.mode} |\n`;
}
tmd += `\n## 配色样本\n\n每套主题声明三个颜色：底色 / 字色 / 强调色。\n\n| 名称 | 底 | 字 | 强调 |\n|---|---|---|---|\n`;
for (const t of themeMeta) {
  tmd += `| ${t.name} | ${t.swatch[0] || "—"} | ${t.swatch[1] || "—"} | ${t.swatch[2] || "—"} |\n`;
}

// ── presets.md ──
const presetFiles = fs.readdirSync(path.join(WB, "presets")).filter((f) => f.endsWith(".json")).sort();
let pmd = `# 模板参考

> 本文件由 \`scripts/gen-docs.mjs\` 自动生成，**不要手改**。

模板是 \`_wb/presets/*.json\`，格式和看板布局文件一样。自己加一个就会出现在「⚡ 模板」列表里。
套用时会跑一遍布局算法并按实际内容重新定高，所以手写坐标不必精确。

`;
for (const f of presetFiles) {
  const p = JSON.parse(fs.readFileSync(path.join(WB, "presets", f), "utf8"));
  pmd += `\n## ${zh(p.name)}（\`${f.replace(/\.json$/, "")}\`）\n\n${zh(p.desc)}\n\n`;
  pmd += `默认主题：${p.theme || "_不指定，沿用当前_"}　·　${p.blocks.length} 个组件\n\n`;
  pmd += `| 组件 | 位置 | 尺寸 |\n|---|---|---|\n`;
  for (const b of p.blocks) pmd += `| \`${b.c}\` | x${b.x} y${b.y} | ${b.w}×${b.h} |\n`;
}

fs.mkdirSync(DOCS, { recursive: true });
fs.writeFileSync(path.join(DOCS, "components.md"), md, "utf8");
fs.writeFileSync(path.join(DOCS, "themes.md"), tmd, "utf8");
fs.writeFileSync(path.join(DOCS, "presets.md"), pmd, "utf8");

console.log(`✓ docs/components.md  ${ids.length} 个组件`);
console.log(`✓ docs/themes.md      ${themeMeta.length} 套主题`);
console.log(`✓ docs/presets.md     ${presetFiles.length} 套模板`);
