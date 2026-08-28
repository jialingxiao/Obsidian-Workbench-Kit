/* ============================================================
 * Obsidian Workbench Kit · 调度器 (dispatcher)
 * ------------------------------------------------------------
 * 这是整个组件库唯一的入口。用户笔记里只会出现这一种写法：
 *
 *   ```dataviewjs
 *   await dv.view("_wb", { c: "heatmap", source: "@inbox" })
 *   ```
 *
 * 本文件不渲染任何东西，它只负责：定位根目录 → 加载并缓存内核
 * → 把控制权交给 core/runtime.js。
 * 不要在这里写组件逻辑。
 * ========================================================== */

const WB_VERSION = "0.4.2";

/* 数据层是可替换的：core/query.js 走 Dataview，core/query-native.js 直接
 * 读 Obsidian 的 metadataCache。dataviewjs 模式当然用前者；后者是插件版
 * 用的，这里留一个 window 开关只为了能在预览器里验证它 —— 不然那份代码
 * 要等插件全部做完才第一次跑起来。 */
const WB_QUERY = (typeof window !== "undefined" && window.__WB_QUERY__) || "query";

// [文件名, 挂到 WB 上的键名]
const WB_MODULES = [
  ["dom", "dom"], ["i18n", "i18n"], ["config", "config"], ["theme", "theme"], ["astro", "astro"],
  [WB_QUERY, "query"], ["ui", "ui"], ["runtime", "runtime"], ["store", "store"],
  ["board", "board"], ["editor", "editor"],
];

const wbInput = input || {};

/* ── 定位 _wb 根目录 ─────────────────────────────────────────
 * 默认 "_wb"，但用户可能重命名或移动文件夹，所以扫一遍 vault
 * 找 <某目录>/core/runtime.js。结果缓存在 window 上。 */
function wbDetectRoot(dv) {
  if (wbInput.root) return wbInput.root;
  if (window.__WB_ROOT__) return window.__WB_ROOT__;

  let root = "_wb";
  try {
    const files = dv.app.vault.getFiles();
    const paths = new Set(files.map((f) => f.path));
    const candidates = files
      .filter((f) => /(^|\/)core\/runtime\.js$/.test(f.path))
      .map((f) => f.path.replace(/\/core\/runtime\.js$/, ""))
      // 必须同时有 view.js，否则可能撞上别的插件带进库里的同名文件
      .filter((r) => paths.has(`${r}/view.js`));
    if (candidates.length) {
      root = candidates.includes("_wb") ? "_wb" : candidates[0];
    }
  } catch (e) {
    /* 扫描失败就用默认值 */
  }
  window.__WB_ROOT__ = root;
  return root;
}

/* ── 加载内核（带缓存）───────────────────────────────────── */
async function wbBoot(dv) {
  const root = wbDetectRoot(dv);

  const cached = window.__WB__;
  if (cached && cached.version === WB_VERSION && cached.root === root) {
    // dev: true 时永远重新加载，方便边改边看
    if (!cached.config.data.dev) return cached;
  }

  const tryRead = async (rel) => {
    try {
      const src = await dv.io.load(`${root}/${rel}`);
      return src == null ? null : src;
    } catch (e) {
      return null;
    }
  };
  const read = async (rel) => {
    const src = await tryRead(rel);
    if (src == null) throw new Error(`找不到文件：${root}/${rel}`);
    return src;
  };

  /* ── 宿主接口 ────────────────────────────────────────────────
   * 内核只通过 host 接触外界：读资源、列资源、存看板布局。
   * dataviewjs 模式下这些落到 vault 文件上；将来插件模式下同一套内核
   * 换一个 host 就能跑在打包进插件的资源上 —— 组件一行不用改。 */
  const host = {
    kind: "vault",
    root,
    read: tryRead,

    /* 列出可用的组件 / 主题 / 模板。靠扫文件而不是维护清单：
     * 加个文件夹就自动出现在面板里，不会有清单忘了同步的问题。 */
    list(kind) {
      const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pat = {
        components: new RegExp(`^${esc(root)}/components/([a-z][a-z0-9-]*)/component\\.js$`),
        themes: new RegExp(`^${esc(root)}/themes/([^/]+)\\.css$`),
        presets: new RegExp(`^${esc(root)}/presets/([^/]+)\\.json$`),
      }[kind];
      if (!pat) return [];
      const out = [];
      for (const f of dv.app.vault.getFiles()) {
        const m = pat.exec(f.path);
        if (m) out.push(m[1]);
      }
      return [...new Set(out)].sort();
    },

    /* 看板布局。用 vault.adapter 而不是 vault.modify：adapter 不经过
     * Obsidian 的 md 索引，因此不会触发 Dataview 自动刷新 —— 否则每拖
     * 一次就重渲染一次，会自己跟自己打架。 */
    boards: {
      path: (name) => `${root}/boards/${name}.json`,
      async load(name) {
        const p = host.boards.path(name);
        try {
          if (await dv.app.vault.adapter.exists(p)) return await dv.app.vault.adapter.read(p);
        } catch (e) {
          console.warn(`[Workbench] 读取布局 ${p} 失败`, e);
        }
        return null;
      },
      async save(name, raw) {
        const dir = `${root}/boards`;
        try {
          if (!(await dv.app.vault.adapter.exists(dir))) await dv.app.vault.adapter.mkdir(dir);
          await dv.app.vault.adapter.write(host.boards.path(name), raw);
          return true;
        } catch (e) {
          console.error(`[Workbench] 保存布局失败`, e);
          return false;
        }
      },
    },
  };

  const WB = { version: WB_VERSION, root, read, tryRead, host, app: dv.app };

  for (const [name, key] of WB_MODULES) {
    const src = await read(`core/${name}.js`);
    let factory;
    try {
      factory = new Function(`"use strict"; return (${src});`)();
    } catch (e) {
      throw new Error(`内核模块 core/${name}.js 语法错误 — ${e.message}`);
    }
    if (typeof factory !== "function") {
      throw new Error(`内核模块 core/${name}.js 必须导出一个 (WB) => {...} 工厂函数`);
    }
    WB[key] = await factory(WB);
  }

  window.__WB__ = WB;
  return WB;
}

/* ── 启动 ───────────────────────────────────────────────── */
try {
  const WB = await wbBoot(dv);
  await WB.runtime.render(dv, wbInput);
} catch (e) {
  // 内核起不来时没有样式可用，这里用内联样式兜底
  const box = dv.container.createEl("div");
  box.setAttribute(
    "style",
    "border:1px solid var(--color-red,#d33);border-left-width:4px;border-radius:6px;" +
      "padding:12px 14px;margin:8px 0;font-size:13px;line-height:1.6;" +
      "background:rgba(221,51,51,.06);color:var(--text-normal,#333)"
  );
  const title = box.createEl("div");
  title.setAttribute("style", "font-weight:600;color:var(--color-red,#d33);margin-bottom:4px");
  title.textContent = "Workbench 启动失败";
  const msg = box.createEl("div");
  msg.textContent = String((e && e.message) || e);
  const hint = box.createEl("div");
  hint.setAttribute("style", "margin-top:6px;opacity:.7;font-size:12px");
  hint.textContent = "请确认 _wb 文件夹已完整放入库中，且 Dataview 设置里已开启 JavaScript Queries。";
}
