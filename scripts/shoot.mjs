/* 把每套模板截成 PNG
 *
 *   node scripts/shoot.mjs              # 全部
 *   node scripts/shoot.mjs office life  # 只截这几套
 *
 * 需要本地起着静态服务器（python -m http.server 8123，见 .claude/launch.json）。
 * 用无头 Chrome/Edge，不装 puppeteer —— 这个项目全程没有 npm 依赖，
 * 为了截图引入一棵 node_modules 不值得。
 *
 * 跑两遍：第一遍 --dump-dom 从标题里读出画面实际多高，第二遍按这个高度开窗
 * 截图。一遍是不行的：headless 的 --screenshot 只截视口那么大，窗口开小了
 * 会切掉内容，开大了底下留一条背景色。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* 默认出到 dist/shots（2 倍图，发社媒用，不进仓库）。
   WB_SHOT_OUT + WB_SHOT_SCALE=1 可以另出一套 1 倍图给 README —— 2 倍图
   一张就半兆，九张塞进仓库太重。 */
const OUT = process.env.WB_SHOT_OUT
  ? path.resolve(process.env.WB_SHOT_OUT)
  : path.join(ROOT, "dist", "shots");
const BASE = process.env.WB_SHOT_URL || "http://localhost:8123/dev/shots.html";
const WIDTH = Number(process.env.WB_SHOT_WIDTH || 1280);
const SCALE = Number(process.env.WB_SHOT_SCALE || 2);   // 2 倍图，社媒上不糊

const CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const BROWSER = process.env.WB_CHROME || CANDIDATES.find((p) => fs.existsSync(p));
if (!BROWSER) {
  console.error("找不到 Chrome / Edge。用 WB_CHROME 指定可执行文件路径。");
  process.exit(1);
}

/* 每次启动都用一个独立的 profile 目录。
   共用一个目录时，上一个 Chrome 还没退干净，下一个就会拿不到锁然后静默
   摆烂 —— 表现是九套模板随机成功两三套，看起来像「页面没渲染完」。 */
let profileSeq = 0;
const TMP = process.env.TEMP || process.env.TMPDIR || "/tmp";
function commonArgs() {
  return [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${path.join(TMP, `wb-shot-${process.pid}-${profileSeq++}`)}`,
    "--virtual-time-budget=30000",
  ];
}

function run(args) {
  return execFileSync(BROWSER, args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
}

/* 量高度。偶尔第一次会赶在渲染完成之前拿到 DOM，重试一次就好。 */
function measure(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const m = run([...commonArgs(), "--dump-dom", url]).match(/WBSHOT h=(\d+) n=(\d+)/);
    if (m) return { height: Number(m[1]), count: Number(m[2]) };
  }
  return null;
}

const presets = fs.readdirSync(path.join(ROOT, "vault", "_wb", "presets"))
  .filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
const want = process.argv.slice(2);
const list = want.length ? presets.filter((p) => want.includes(p)) : presets;
if (!list.length) {
  console.error(`没有匹配的模板。现有：${presets.join("、")}`);
  process.exit(1);
}

/* 先确认静态服务器活着。
   少了这一步，服务器没起的时候九套模板会齐刷刷报「量不到高度，没渲染完」——
   指向的是渲染，真正的原因却是根本没连上。我自己就被这条信息误导过一次。 */
try {
  const res = await fetch(BASE, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.error(`连不上 ${BASE} —— ${e.message}`);
  console.error("先起静态服务器：python -m http.server 8123（在仓库根目录）");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
console.log(`浏览器 ${path.basename(BROWSER)} · 宽度 ${WIDTH} · ${SCALE}x`);

for (const id of list) {
  const url = `${BASE}?p=${encodeURIComponent(id)}&plain=1&w=${WIDTH}`;

  // 第一遍：量高度
  const got = measure(url);
  if (!got) { console.log(`  !! ${id} 量不到高度（重试三次都没渲染完）`); continue; }
  if (!got.count) { console.log(`  !! ${id} 页面里没有这套模板`); continue; }
  const height = got.height;

  // 第二遍：按实际高度截
  const file = path.join(OUT, `${id}.png`);
  fs.rmSync(file, { force: true });
  run([...commonArgs(), `--force-device-scale-factor=${SCALE}`,
       `--window-size=${WIDTH},${height}`, `--screenshot=${file}`, url]);

  const kb = fs.existsSync(file) ? Math.round(fs.statSync(file).size / 1024) : 0;
  console.log(`  ${kb ? "✓" : "✗"} ${id.padEnd(10)} ${WIDTH}×${height} @${SCALE}x  ${kb} KB`);
}

console.log(`\n输出目录：${OUT}`);
