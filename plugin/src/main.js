/* ============================================================
 * Workbench Kit · Obsidian 插件外壳
 * ------------------------------------------------------------
 * 这个文件不含任何组件逻辑。它做四件事：
 *   1. 用打包进来的资源（WB_ASSETS）把内核引导起来
 *   2. 注册 ```workbench 代码块处理器
 *   3. 提供侧边栏图标、命令、设置界面
 *   4. 跟着库的变化维护数据索引
 *
 * 内核和 31 个组件是从 dataviewjs 版原样搬过来的，一行没改 —— 差异
 * 全部收在 host（资源从哪来、布局存哪去）和 query 层（数据从哪来）。
 *
 * 构建：scripts/build-plugin.mjs 会在本文件前面拼上 WB_ASSETS 和
 * obsidian 的 require，产出单个 main.js。不需要 esbuild 或 npm。
 * ========================================================== */

/* 数据层用原生实现，不依赖 Dataview */
const WB_MODULES = [
  ["dom", "dom"], ["i18n", "i18n"], ["config", "config"], ["theme", "theme"], ["astro", "astro"],
  ["query-native", "query"], ["ui", "ui"], ["runtime", "runtime"], ["store", "store"],
  ["board", "board"], ["editor", "editor"],
];

const DEFAULT_SETTINGS = {
  theme: "素笺",
  locale: "zh",
  dev: false,
  paths: { inbox: "", notes: "", daily: "", output: "" },
  tokens: {},
};

/* 资源清单里挑出某一类的可用名字。dataviewjs 版是扫 vault 文件，
 * 这里是扫打包进来的键名 —— 内核那边看不出区别。 */
function listFromAssets(kind) {
  const pat = {
    components: /^components\/([a-z][a-z0-9-]*)\/component\.js$/,
    themes: /^themes\/(.+)\.css$/,
    presets: /^presets\/(.+)\.json$/,
  }[kind];
  if (!pat) return [];
  const out = [];
  for (const key of Object.keys(WB_ASSETS)) {
    const m = pat.exec(key);
    if (m) out.push(m[1]);
  }
  return [...new Set(out)].sort();
}

class WorkbenchPlugin extends obsidian.Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.WB = await this.bootKernel();

    /* 任务索引必须在任何组件渲染之前建好 —— 组件是同步读任务的，
     * 索引没就绪就只会显示「没有待办」。 */
    await this.WB.query.reindex();

    this.registerMarkdownCodeBlockProcessor("workbench", (src, el, ctx) =>
      this.renderBlock(src, el, ctx)
    );

    this.addRibbonIcon("layout-dashboard", "打开工作台", () => this.openWorkbench());
    this.addCommand({ id: "open-workbench", name: "打开工作台", callback: () => this.openWorkbench() });
    this.addCommand({
      id: "insert-workbench",
      name: "在当前笔记插入工作台",
      editorCallback: (editor) => editor.replaceSelection("```workbench\n```\n"),
    });

    this.addSettingTab(new WorkbenchSettingTab(this.app, this));

    /* 库变了就让数据层失效。重建任务索引要读文件，所以防抖攒一攒再做，
     * 否则连续编辑时会反复全库扫描。 */
    let timer = null;
    const onChange = () => {
      this.WB.query.invalidate();
      clearTimeout(timer);
      timer = setTimeout(() => this.WB.query.reindex().catch(() => {}), 2000);
    };
    this.registerEvent(this.app.metadataCache.on("changed", onChange));
    this.registerEvent(this.app.vault.on("delete", onChange));
    this.registerEvent(this.app.vault.on("rename", onChange));
    this.register(() => clearTimeout(timer));
  }

  onunload() {
    // 内核把样式注入在 head 上，插件卸载时得自己收拾干净
    document.querySelectorAll('style[id^="wb-style-"]').forEach((s) => s.remove());
    document.querySelectorAll(".wb-pop").forEach((p) => p.remove());
  }

  /* ── 内核引导 ───────────────────────────────────────────── */
  async bootKernel() {
    const app = this.app;
    const plugin = this;
    const boardsDir = `${this.manifest.dir}/boards`;

    const host = {
      kind: "plugin",
      root: "(bundled)",
      /* config.json 不是真文件，直接把设置序列化给内核 ——
       * 这样 core/config.js 一行都不用改。 */
      async read(rel) {
        if (rel === "config.json") return JSON.stringify(plugin.settings);
        return WB_ASSETS[rel] ?? null;
      },
      list: listFromAssets,
      boards: {
        /* 布局存在插件自己的数据目录里，不往用户库里塞文件 */
        async load(name) {
          const p = `${boardsDir}/${name}.json`;
          try {
            if (await app.vault.adapter.exists(p)) return await app.vault.adapter.read(p);
          } catch (e) {
            console.warn("[Workbench] 读取布局失败", p, e);
          }
          return null;
        },
        async save(name, raw) {
          try {
            if (!(await app.vault.adapter.exists(boardsDir))) await app.vault.adapter.mkdir(boardsDir);
            await app.vault.adapter.write(`${boardsDir}/${name}.json`, raw);
            return true;
          } catch (e) {
            console.error("[Workbench] 保存布局失败", e);
            return false;
          }
        },
      },
    };

    const tryRead = (rel) => host.read(rel);
    const WB = {
      version: WB_VERSION,
      root: "(bundled)",
      app,
      host,
      tryRead,
      read: async (rel) => {
        const v = await tryRead(rel);
        if (v == null) throw new Error(`插件包里缺少资源：${rel}`);
        return v;
      },
    };

    for (const [name, key] of WB_MODULES) {
      const src = await WB.read(`core/${name}.js`);
      const factory = new Function(`"use strict"; return (${src});`)();
      WB[key] = await factory(WB);
    }
    return WB;
  }

  /* ── ```workbench 代码块 ────────────────────────────────── */
  async renderBlock(src, el, ctx) {
    let input = {};
    try {
      input = obsidian.parseYaml(src) || {};
    } catch (e) {
      input = { __parseError: String(e.message || e) };
    }
    if (typeof input !== "object" || Array.isArray(input)) input = {};

    const child = new obsidian.MarkdownRenderChild(el);
    ctx.addChild(child);

    /* 内核是照着 dataviewjs 的 dv 对象写的，这里造一个形状相同的替身。
     * 只用到这四样：容器、app、当前笔记、渲染生命周期。 */
    const app = this.app;
    const dvLike = {
      container: el,
      containerEl: el,
      app,
      component: child,
      current() {
        const f = app.vault.getAbstractFileByPath(ctx.sourcePath);
        const fm = f ? app.metadataCache.getFileCache(f)?.frontmatter || {} : {};
        return Object.assign({}, fm, { file: { path: ctx.sourcePath } });
      },
    };

    if (input.__parseError) {
      el.createEl("div", { cls: "wb-error", text: `工作台配置解析失败：${input.__parseError}` });
      return;
    }

    try {
      await this.WB.runtime.render(dvLike, input);
    } catch (e) {
      console.error("[Workbench]", e);
      el.createEl("div", { cls: "wb-error", text: `工作台渲染失败：${e.message || e}` });
    }
  }

  /* ── 打开（必要时创建）工作台笔记 ───────────────────────── */
  async openWorkbench() {
    const name = "工作台.md";
    let file = this.app.vault.getAbstractFileByPath(name);
    if (!file) {
      // 找找库里有没有已经写了 workbench 代码块的笔记
      for (const f of this.app.vault.getMarkdownFiles()) {
        const cache = this.app.metadataCache.getFileCache(f);
        if ((cache?.sections || []).some((s) => s.type === "code")) {
          const text = await this.app.vault.cachedRead(f);
          if (/^```workbench\s*$/m.test(text)) { file = f; break; }
        }
      }
    }
    if (!file) {
      file = await this.app.vault.create(name,
        "---\ncssclasses: [wb-page]\nobsidianUIMode: preview\n---\n\n```workbench\n```\n");
      new obsidian.Notice("已创建「工作台」笔记");
    }
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // 配置读的是 host.read("config.json")，重建内核最省事也最不容易出错
    this.WB = await this.bootKernel();
    await this.WB.query.reindex();
    new obsidian.Notice("Workbench 设置已保存，重新打开笔记即可生效");
  }
}

/* ── 设置界面 ─────────────────────────────────────────────── */
class WorkbenchSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl: c } = this;
    c.empty();
    const s = this.plugin.settings;

    c.createEl("h2", { text: "Workbench Kit" });

    new obsidian.Setting(c)
      .setName("主题")
      .setDesc("所有组件的配色与字体。也可以在单篇笔记的 frontmatter 里用 wbTheme 覆盖。")
      .addDropdown(async (d) => {
        for (const id of listFromAssets("themes")) {
          const meta = await this.plugin.WB.theme.meta(id);
          d.addOption(meta.name || id, `${meta.name || id} — ${meta.desc || ""}`);
        }
        d.setValue(s.theme).onChange(async (v) => {
          s.theme = v;
          await this.plugin.saveSettings();
        });
      });

    new obsidian.Setting(c)
      .setName("语言")
      .addDropdown((d) =>
        d.addOption("zh", "中文").addOption("en", "English")
          .setValue(s.locale)
          .onChange(async (v) => { s.locale = v; await this.plugin.saveSettings(); })
      );

    c.createEl("h3", { text: "路径别名" });
    c.createEl("p", {
      cls: "setting-item-description",
      text: "组件里写 @inbox 而不是具体文件夹名。在这里把别名指向你库里真实的文件夹，" +
            "所有组件和模板就自动对上了 —— 这是同一套组件能在不同库里复用的原因。留空表示不启用该别名。",
    });

    for (const key of ["inbox", "notes", "daily", "output"]) {
      new obsidian.Setting(c)
        .setName(`@${key}`)
        .addText((t) =>
          t.setPlaceholder("例如 00.收件箱")
            .setValue(s.paths[key] || "")
            .onChange(async (v) => { s.paths[key] = v.trim(); await this.plugin.saveSettings(); })
        );
    }

    new obsidian.Setting(c)
      .setName("自定义别名")
      .setDesc('每行一个，格式 别名 = 文件夹。例如：books = 02.读书')
      .addTextArea((t) => {
        const known = new Set(["inbox", "notes", "daily", "output"]);
        const extra = Object.entries(s.paths)
          .filter(([k]) => !known.has(k))
          .map(([k, v]) => `${k} = ${v}`)
          .join("\n");
        t.setValue(extra).onChange(async (v) => {
          for (const k of Object.keys(s.paths)) if (!known.has(k)) delete s.paths[k];
          for (const line of v.split("\n")) {
            const m = line.match(/^\s*([^=\s]+)\s*=\s*(.+?)\s*$/);
            if (m) s.paths[m[1]] = m[2];
          }
          await this.plugin.saveSettings();
        });
        t.inputEl.rows = 4;
      });

    c.createEl("h3", { text: "高级" });

    new obsidian.Setting(c)
      .setName("配色微调")
      .setDesc('每行一个，格式 token = 值。例如：accent = #8B5CF6　或　radius = 2px')
      .addTextArea((t) => {
        t.setValue(Object.entries(s.tokens).map(([k, v]) => `${k} = ${v}`).join("\n"))
          .onChange(async (v) => {
            s.tokens = {};
            for (const line of v.split("\n")) {
              const m = line.match(/^\s*([\w-]+)\s*=\s*(.+?)\s*$/);
              if (m) s.tokens[m[1]] = m[2];
            }
            await this.plugin.saveSettings();
          });
        t.inputEl.rows = 3;
      });

    new obsidian.Setting(c)
      .setName("重建数据索引")
      .setDesc("任务索引平时会自动跟着库更新。如果发现待办对不上，可以手动重建一次。")
      .addButton((b) =>
        b.setButtonText("重建").onClick(async () => {
          const n = await this.plugin.WB.query.reindex();
          new obsidian.Notice(`已重建索引：${n} 个文件含待办`);
        })
      );

    // 直接用 text 选项，不调 setText —— 少依赖一个 Obsidian 的 DOM 扩展
    c.createEl("p", {
      cls: "setting-item-description",
      text: `内核 v${WB_VERSION} · ${listFromAssets("components").length} 个组件 · ` +
            `${listFromAssets("themes").length} 套主题 · ${listFromAssets("presets").length} 套模板`,
    });
  }
}

module.exports = WorkbenchPlugin;
