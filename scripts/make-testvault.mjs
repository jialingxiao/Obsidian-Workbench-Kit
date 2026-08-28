/* 生成一个可直接用 Obsidian 打开的测试库
 *
 *   node scripts/make-testvault.mjs
 *
 * 做三件事：造假笔记 → 装好 _wb 与示例首页 → 配好 Dataview。
 * 之后还需要跑 scripts/set-times.ps1 把文件时间戳改成假的创建日期，
 * 否则热力图会挤成今天一根柱子。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* 仓库根目录。Node 在 Windows 上无法从含非 ASCII 字符的路径启动脚本
 * （报 exit 9），所以留了 WB_ROOT 这个逃生口：把本脚本复制到 ASCII 路径
 * 下运行，用 WB_ROOT 指回真正的仓库位置即可。fs 读写中文路径本身没问题。 */
const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VAULT = path.join(ROOT, "testvault");

const FOLDERS = {
  "00.inbox": 40,
  "01.notes": 90,
  "01.notes/concepts": 45,
  Daily: 60,
  "99.output": 15,
};

/* 固定种子，保证每次生成的库一模一样，方便对比改动前后的渲染 */
let seed = 20260828;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const TOPICS = [
  "注意力机制", "向量数据库", "上下文窗口", "检索增强生成", "思维链",
  "知识图谱", "语义搜索", "模型蒸馏", "提示词工程", "多智能体",
  "长期记忆", "工具调用", "评估基准", "微调策略", "量化压缩",
];
const KINDS = ["笔记", "摘要", "综述", "实验", "读书", "随笔"];

function frontmatter(o) {
  const lines = Object.entries(o).map(([k, v]) =>
    Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`
  );
  return `---\n${lines.join("\n")}\n---\n`;
}

function noteBody(title) {
  const n = 2 + Math.floor(rnd() * 3);
  const paras = [];
  for (let i = 0; i < n; i++) {
    paras.push(
      `${pick(TOPICS)}在实际使用中经常和${pick(TOPICS)}一起出现。` +
        `这里记一笔${title}的观察，方便以后回看时能接上当时的思路。`
    );
  }
  return `\n## 要点\n\n- ${pick(TOPICS)}\n- ${pick(TOPICS)}\n\n${paras.join("\n\n")}\n\n相关：[[${pick(TOPICS)}]]\n`;
}

/* 时间分布：向近期倾斜，并且刻意留出空白日子 —— 全满的热力图看不出疏密 */
function randomDate() {
  const daysAgo = Math.floor(Math.pow(rnd(), 1.7) * 360);
  const d = new Date();
  d.setHours(9 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// ── 清掉上一次生成的笔记，但保留 .obsidian（插件配置不用重装）──
for (const f of Object.keys(FOLDERS)) {
  const dir = path.join(VAULT, f.split("/")[0]);
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.mkdirSync(VAULT, { recursive: true });

const stamps = [];

for (const [folder, count] of Object.entries(FOLDERS)) {
  fs.mkdirSync(path.join(VAULT, folder), { recursive: true });

  for (let i = 0; i < count; i++) {
    const date = randomDate();
    const isDaily = folder === "Daily";
    const topic = pick(TOPICS);
    const name = isDaily
      ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      : `${topic}-${pick(KINDS)}-${i}`;

    const rel = `${folder}/${name}.md`;
    const abs = path.join(VAULT, rel);
    if (fs.existsSync(abs)) continue; // Daily 撞日期就跳过

    const fm = frontmatter(
      isDaily
        ? { tags: ["daily"], created: name }
        : { tags: [pick(KINDS), "kb"], 一句话描述: `关于${topic}的一条记录` }
    );
    fs.writeFileSync(abs, fm + `\n# ${name}\n` + noteBody(topic), "utf8");
    stamps.push({ path: rel, time: date.toISOString() });
  }
}

// ── 装 _wb 与示例首页 ──
/* 手写递归复制而不用 fs.cpSync：后者在部分 Windows + Node 24 组合下
 * 会直接把进程打崩（0xC0000409，且不留任何报错）。 */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(ROOT, "vault", "_wb"), path.join(VAULT, "_wb"));

// 测试库的目录名和默认配置不同，改掉别名映射
const cfgPath = path.join(VAULT, "_wb", "config.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
cfg.paths = { inbox: "00.inbox", notes: "01.notes", daily: "Daily", output: "99.output" };
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");

for (const f of fs.readdirSync(path.join(ROOT, "examples"))) {
  fs.copyFileSync(path.join(ROOT, "examples", f), path.join(VAULT, f));
}

// ── Dataview 配置（插件本体由 install-dataview 步骤复制）──
const obs = path.join(VAULT, ".obsidian");
fs.mkdirSync(obs, { recursive: true });

/* 顺手把当前构建的插件装进去并启用。
 *
 * 以前这一步是手工复制的，结果测试库里躺着一个 v0.3.0 的包，而且
 * community-plugins.json 里只写了 dataview —— 插件根本不会被加载。
 * 真机验证要是踩在这两件事上，测的就是三个版本前的代码。
 * 装进去的是 dist/plugin，也就是真正要发给用户的那个包。 */
const enabled = ["dataview"];
const built = path.join(ROOT, "dist", "plugin");
if (fs.existsSync(path.join(built, "main.js"))) {
  const dest = path.join(obs, "plugins", "workbench-kit");
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(built, dest);
  enabled.push("workbench-kit");
  const v = JSON.parse(fs.readFileSync(path.join(built, "manifest.json"), "utf8")).version;
  console.log(`✓ 装入插件 v${v} → .obsidian/plugins/workbench-kit`);
} else {
  console.log("! 没找到 dist/plugin，跳过插件安装 —— 先跑 node scripts/build-plugin.mjs");
}
fs.writeFileSync(path.join(obs, "community-plugins.json"), JSON.stringify(enabled, null, 2), "utf8");
fs.writeFileSync(
  path.join(obs, "app.json"),
  JSON.stringify({ attachmentFolderPath: "assets", alwaysUpdateLinks: true }, null, 2),
  "utf8"
);

// 时间戳清单交给 PowerShell 处理：Node 改不了 Windows 的文件创建时间
fs.writeFileSync(path.join(ROOT, "scripts", ".stamps.json"), JSON.stringify(stamps), "utf8");

console.log(`✓ 生成 ${stamps.length} 篇笔记 → ${VAULT}`);
console.log(`  下一步：pwsh -File scripts/set-times.ps1`);
