/* 配色审计：把每个文字颜色对它「真正会出现在的每一种底色」都查一遍。
 *
 *   node scripts/audit-contrast.mjs
 *
 * 上一版审计只查了文字对 --wb-bg，漏掉了三处文字实际会落在的底：
 *   · --wb-surface     卡片、看板块、报头（plain 样式）
 *   · --wb-mast-bg     报头反色块
 *   · --wb-accent      印章白文、月历高亮日、搜索按钮
 * 这些地方看不清，是「只查一种底色」漏出来的。
 *
 * 顺带量一下「层次感」：底色与卡片色之间如果几乎没有明度差，
 * 整页就是一个平面，看起来单薄 —— 这是配色显得廉价的常见原因。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES = path.join(ROOT, "vault", "_wb", "themes");

/* 素笺全用 Obsidian 原生变量，拿默认主题的取值代入才能审 */
const OBSIDIAN = {
  light: {
    "--background-primary": "#ffffff", "--background-secondary": "#f2f3f5",
    "--background-secondary-alt": "#e3e5e8", "--background-modifier-border": "#ddd",
    "--text-normal": "#222222", "--text-muted": "#5c5c5c", "--text-faint": "#999999",
    "--interactive-accent": "#7b6cd9", "--text-on-accent": "#ffffff",
    "--color-green": "#3d9a50", "--color-red": "#d2404a",
  },
  dark: {
    "--background-primary": "#1e1e1e", "--background-secondary": "#161616",
    "--background-secondary-alt": "#000000", "--background-modifier-border": "#333",
    "--text-normal": "#dadada", "--text-muted": "#b3b3b3", "--text-faint": "#666666",
    "--interactive-accent": "#7b6cd9", "--text-on-accent": "#ffffff",
    "--color-green": "#4caf50", "--color-red": "#fb464c",
  },
};

const hexOf = (v, mode) => {
  let s = String(v).trim();
  for (let i = 0; i < 4; i++) {
    const m = s.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/);
    if (!m) break;
    s = (OBSIDIAN[mode][m[1]] ?? m[2] ?? "").trim();
  }
  const rgba = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const p = rgba[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  }
  const h = s.replace("#", "");
  if (h.length !== 6 && h.length !== 3) return null;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: 1 };
};

/* 半透明色要先和底色混合，否则算出来的对比度是假的 */
const over = (fg, bg) => (fg.a >= 1 ? fg : {
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
});

const lum = (c) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const ratio = (fg, bg) => {
  if (!fg || !bg) return null;
  const a = lum(over(fg, bg)), b = lum(bg);
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
};

function parseTokens(css, block) {
  const t = {};
  for (const m of block.matchAll(/--wb-([a-z0-9-]+):\s*([^;]+);/g)) t[m[1]] = m[2].trim();
  return t;
}

/* 文字 → 它真正会出现的底色。改组件时如果新增了「文字压在某个色块上」，
   记得把那一对加进来，否则审计就有盲区。 */
/* 门槛按底色明暗分开设。
 *
 * WCAG 2 的对比度公式在深色底上系统性高估可读性 —— 同样的比值，
 * 浅底上黑字清清楚楚，深底上灰字却发糊。WCAG 3 草案的 APCA 算法
 * 就是为解决这个问题而提出的。
 *
 * 这里不自己实现 APCA（凭记忆写一套感知模型，错了比不做还糟），
 * 而是给深色底加一个经验倍率：约 1.5 倍。判据仍然可复现，只是
 * 深色那一侧要求更严。
 *
 * 每项两个数：[浅底门槛, 深底门槛] */
const PAIRS = [
  ["text",      "bg",        [7,   13],  "正文 / 页面底"],
  ["muted",     "bg",        [4.5, 9],   "次要 / 页面底"],
  /* faint 用在 --wb-fs-xs（11px）上，属于小字号 —— WCAG 的 3:1
     只适用于大字号，所以按 4.5 起算，深底再乘倍率。 */
  ["faint",     "bg",        [4.5, 7],   "弱化 / 页面底"],
  ["text",      "surface",   [7,   13],  "正文 / 卡片底"],
  ["muted",     "surface",   [4.5, 9],   "次要 / 卡片底"],
  ["faint",     "surface",   [4.5, 7],   "弱化 / 卡片底"],
  ["text",      "surface-2", [7,   13],  "正文 / 次级底"],
  ["muted",     "surface-2", [4.5, 9],   "次要 / 次级底"],
  ["accent",    "bg",        [3,   4.5], "强调色 / 页面底"],
  ["accent",    "surface",   [3,   4.5], "强调色 / 卡片底"],
  ["on-accent", "accent",    [4.5, 4.5], "强调色上的字"],
  ["bg",        "accent",    [4.5, 4.5], "印章白文（底色当字色）"],
  ["mast-text", "mast-bg",   [13,  13],  "报头正文（报头底一律是深色）"],
  ["mast-dim",  "mast-bg",   [7,   7],   "报头小字"],
  ["success",   "bg",        [4.5, 7],   "成功色（会当文字用）"],
  ["danger",    "bg",        [4.5, 7],   "危险色（会当文字用）"],
  ["accent-2",  "bg",        [3,   4.5], "次强调色 / 页面底"],
  /* 边框在深底上常常暗到看不见，卡片就没有边缘，整页显得平。
     这一项不是可读性，是「看不看得出这是一块卡片」。 */
  ["border",    "bg",        [1.2, 1.35], "边框可见度"],
];

const files = fs.readdirSync(THEMES).filter((f) => f.endsWith(".css")).sort();
let fails = [];
let inheritedIssues = [];   // 素笺这类跟随 Obsidian 变量的，取值不由我们决定
const layering = [];
const allVariants = [];     // [label, tokens, mode]，末尾统计实测最低值用

for (const f of files) {
  const css = fs.readFileSync(path.join(THEMES, f), "utf8");
  const id = f.replace(/\.css$/, "");
  const name = (css.match(/@name[ \t]+(.+)/) || [, id])[1].trim();
  const blocks = css.split("}");
  const base = parseTokens(css, blocks[0]);
  /* 认选择器，不认字符串：松烟的注释里写了「没有 .theme-dark 覆写」，
     按 includes 匹配会凭空多出一个「松烟 深」变体，读数还和浅色那行一模一样。 */
  const darkIdx = blocks.findIndex((b) => /\.theme-dark\s+\.wb/.test(b));

  const variants = [["", base, "light"]];
  if (darkIdx >= 0) variants.push([" 深", { ...base, ...parseTokens(css, blocks[darkIdx]) }, "dark"]);
  // 认定深色的主题（没有 .theme-dark 覆写），底色本身就是深的
  const isDarkOnly = darkIdx < 0 && hexOf(base.bg, "light") && lum(hexOf(base.bg, "light")) < 0.2;

  for (const [tag, tok, mode] of variants) {
    const label = name + tag;
    allVariants.push([label, tok, mode]);
    for (const [fgK, bgK, mins, what] of PAIRS) {
      const fg = hexOf(tok[fgK], mode), bg = hexOf(tok[bgK], mode);
      if (!fg || !bg) continue;
      const dark = lum(bg) < 0.15;
      const min = Array.isArray(mins) ? (dark ? mins[1] : mins[0]) : mins;
      const r = ratio(fg, bg);
      const inherited = String(tok[fgK]).includes("var(") || String(tok[bgK]).includes("var(");
      if (r != null && r < min) {
        (inherited ? inheritedIssues : fails).push(
          { theme: label, what, got: r, min, fg: `${fgK}=${tok[fgK]}`, bg: `${bgK}=${tok[bgK]}` });
      }
    }
    /* 层次感用「对比度比值」而不是明度差：绝对明度在深色底上天然就小，
       #0D1015 和 #171B22 的明度差只有 0.006，但比值 1.11，肉眼分得清。
       用明度差衡量会把所有深色主题都误判成平面。 */
    const bg = hexOf(tok.bg, mode), sf = hexOf(tok.surface, mode), s2 = hexOf(tok["surface-2"], mode);
    if (bg && sf) {
      const bd = hexOf(tok.border, mode);
      layering.push({
        theme: label,
        "底↔卡片": ratio(sf, bg),
        "底↔次级": s2 ? ratio(s2, bg) : null,
        边框: bd ? ratio(bd, bg) : null,
        阴影: (tok.shadow || "none") === "none" ? "无" : "有",
      });
    }
  }
}

console.log("── 对比度不达标 ──");
if (!fails.length) console.log("  （无）");
for (const f of fails) {
  console.log(`  !! ${f.theme.padEnd(8)} ${f.what.padEnd(16)} ${String(f.got).padStart(5)} < ${f.min}   ${f.fg}  底 ${f.bg}`);
}

/* 分层有两条路，满足一条就行：
   · 明度阶 —— 卡片比页底亮（浅色主题走这条）
   · 边框   —— 卡片底和页底几乎一样，但边缘看得见（深色主题走这条）
   深色底上硬提卡片明度会把「文字 / 卡片底」的对比度压下去，
   所以深色主题是刻意选的边框分层。只有两条都不成立才算真的平。 */
console.log("\n── 层次感（卡片要么比页底亮，要么有看得见的边框）──");
for (const l of layering) {
  const byTone = l["底↔卡片"] >= 1.10;
  const byEdge = (l.边框 ?? 0) >= 1.35;
  const how = byTone && byEdge ? "明度阶+边框" : byTone ? "明度阶" : byEdge ? "边框分层" : "两条路都没走通";
  console.log(`  ${byTone || byEdge ? "  " : "!!"} ${l.theme.padEnd(8)} 底↔卡片 ${String(l["底↔卡片"]).padEnd(6)} 边框 ${String(l.边框).padEnd(6)} 阴影 ${String(l.阴影).padEnd(3)} ${how}`);
}

/* README 里那张「门槛 / 实测最低」表以前是手抄的，改了配色就悄悄过期。
   这里直接把实测值打出来，抄一遍就行。 */
console.log("\n── 实测最低值（README 表格用）──");
console.log("  用途                 浅底门槛 实测   深底门槛 实测");
for (const [fgK, bgK, mins, what] of PAIRS) {
  const buckets = { light: [], dark: [] };
  for (const [label, tok, mode] of allVariants) {
    const fg = hexOf(tok[fgK], mode), bg = hexOf(tok[bgK], mode);
    if (!fg || !bg) continue;
    if (String(tok[fgK]).includes("var(") || String(tok[bgK]).includes("var(")) continue;
    buckets[lum(bg) < 0.15 ? "dark" : "light"].push(ratio(fg, bg));
  }
  const fmt = (a) => (a.length ? String(Math.min(...a)).padStart(6) : "     —");
  console.log(`  ${what.padEnd(20)} ${String(mins[0]).padStart(4)} ${fmt(buckets.light)}   ${String(mins[1]).padStart(4)} ${fmt(buckets.dark)}`);
}

if (inheritedIssues.length) {
  console.log("\n── 跟随用户 Obsidian 主题的（取值不由我们决定，仅记录）──");
  for (const f of inheritedIssues) {
    console.log(`   · ${f.theme.padEnd(8)} ${f.what.padEnd(16)} ${String(f.got).padStart(5)} < ${f.min}`);
  }
}

console.log(`\n对比度问题 ${fails.length} 处（另有 ${inheritedIssues.length} 处继承自用户主题）`);
process.exit(fails.length ? 1 : 0);
