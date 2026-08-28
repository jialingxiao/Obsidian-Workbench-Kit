/* ============================================================
   假库 + Obsidian API 桩件
   给 dev/preview.html 和 dev/plugin-test.html 共用。
   种子固定，所以两个测试台看到的是同一批笔记，结果可以互相对照。
   ========================================================== */

const WB_TOPICS = ["注意力机制","向量数据库","上下文窗口","检索增强生成","思维链","知识图谱","语义搜索","模型蒸馏"];

const WB_SAMPLE_MD = `---
tags: [笔记]
---

## 要点

- 注意力机制让模型能按需分配算力
- 上下文窗口决定了一次能看多少材料

## 展开

检索增强生成把外部知识接进来，缓解了参数记忆的局限。
相关：[[向量数据库]]
`;

function makeFakePages() {
  const folders = ["00.inbox", "01.notes", "01.notes/concepts", "01.notes/entities", "99.output"];
  const pages = [];
  const now = Date.now();
  let seed = 20260828;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const p2 = (x) => String(x).padStart(2, "0");

  for (let i = 0; i < 420; i++) {
    const folder = folders[Math.floor(rnd() * folders.length)];
    const daysAgo = Math.floor(Math.pow(rnd(), 1.4) * 730);
    const ctime = new Date(now - daysAgo * 86400000);
    const name = `${WB_TOPICS[Math.floor(rnd() * WB_TOPICS.length)]}-${i}`;
    const path = `${folder}/${name}.md`;

    const tasks = [];
    if (rnd() < 0.12) {
      const n = 1 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        // 一部分带 📅 到期日，供 upcoming 组件验证（含逾期）
        const dated = rnd() < 0.5;
        const due = new Date(now + (Math.floor(rnd() * 24) - 6) * 86400000);
        const dueStr = `${due.getFullYear()}-${p2(due.getMonth() + 1)}-${p2(due.getDate())}`;
        tasks.push({
          text: `整理 ${name} 的${k ? "参考文献" : "要点"}` + (dated ? ` 📅 ${dueStr}` : ""),
          completed: rnd() < 0.3, path, line: k,
        });
      }
    }

    const tags = [];
    if (rnd() < 0.75) tags.push("#" + ["笔记", "摘要", "综述", "实验", "读书"][Math.floor(rnd() * 5)]);
    if (rnd() < 0.4) tags.push("#kb");

    const inlinks = [], outlinks = [];
    const nIn = rnd() < 0.35 ? 0 : Math.floor(Math.pow(rnd(), 2.2) * 14);
    for (let k = 0; k < nIn; k++) inlinks.push({ path: `01.notes/x${k}.md` });
    for (let k = 0; k < Math.floor(rnd() * 4); k++) outlinks.push({ path: `01.notes/y${k}.md` });

    pages.push({
      file: { path, name, ctime, mtime: new Date(ctime.getTime() + 3600000), tasks, tags, inlinks, outlinks },
      一句话描述: `关于${name.split("-")[0]}的一条记录`,
      // 一部分笔记带阅读进度，供 reading 组件验证
      ...(i % 17 === 0 ? { 进度: `${20 + (i % 9) * 30}/300` } : {}),
    });
  }

  // 日记：最近 14 天里挑一部分，供 daily / calendar / streak 用
  for (let d = 0; d < 14; d++) {
    if (d % 3 === 1) continue;
    const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(9, 0, 0, 0);
    const name = `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())}`;
    // 日记里带习惯打卡的待办，供 habit / week 组件验证
    const dTasks = [];
    ["晨跑", "读书", "冥想"].forEach((hb, k) => {
      dTasks.push({ text: hb, completed: (d + k) % 3 !== 0, path: `Daily/${name}.md`, line: k });
    });
    pages.push({ file: { path: `Daily/${name}.md`, name, ctime: dt, mtime: dt, tasks: dTasks, tags: ["#daily"], inlinks: [], outlinks: [] } });
  }
  return pages;
}

/* 构造一个 Obsidian app 桩件。
   两套数据层都能跑在它上面：Dataview 版走 dv.pages（预览器另外包一层），
   原生版走 metadataCache / getMarkdownFiles / cachedRead。 */
function makeFakeApp(opts = {}) {
  const pages = opts.pages || makeFakePages();
  const extraFiles = opts.extraFiles || [];
  /* 假附件：attachments 组件要看非 md 文件的体积，其中一部分故意不被任何
     笔记引用，好让「无人引用」那条路径有东西可查 */
  const attachments = [];
  for (let i = 0; i < 18; i++) {
    attachments.push({
      path: `assets/图片-${i}.png`,
      name: `图片-${i}.png`,
      stat: { size: 20000 + i * 37000, ctime: Date.now(), mtime: Date.now() },
    });
  }
  const files = [
    ...extraFiles,
    ...attachments,
    ...pages.map((p) => ({ path: p.file.path, name: p.file.path.split("/").pop(),
                           stat: { size: 2048, ctime: +p.file.ctime, mtime: +p.file.mtime } })),
  ];
  const memFiles = opts.files || {};
  const log = opts.log || ((...a) => console.log("[stub]", ...a));

  const asTFile = (p) => ({
    path: p.file.path,
    basename: p.file.name,
    parent: { path: p.file.path.replace(/\/[^/]+$/, "") },
    stat: { ctime: +p.file.ctime, mtime: +p.file.mtime, size: 1024 },
  });

  const app = {
    __pages: pages,
    __files: memFiles,
    vault: {
      getName: () => "个人知识库",
      getFiles: () => files,
      getMarkdownFiles: () => pages.map(asTFile),
      getAbstractFileByPath: (p) => {
        const hit = pages.find((x) => x.file.path === p);
        if (hit) return asTFile(hit);
        return files.some((f) => f.path === p) ? { path: p } : null;
      },
      getResourcePath: (f) => f.path,
      /* 原生数据层要从正文里抠任务文本，所以行号必须和 listItems 对得上 */
      cachedRead: async (f) => {
        if (memFiles[f.path] != null) return memFiles[f.path];
        const p = pages.find((x) => x.file.path === f.path);
        if (!p || !p.file.tasks.length) return WB_SAMPLE_MD;
        const lines = [];
        for (const t of p.file.tasks) {
          while (lines.length < (t.line ?? 0)) lines.push("");
          lines[t.line ?? lines.length] = `- [${t.completed ? "x" : " "}] ${t.text}`;
        }
        return lines.join("\n");
      },
      read: async (f) => app.vault.cachedRead(f),
      modify: async (f, text) => { memFiles[f.path] = text; log("modify", f.path); },
      create: async (p, body) => { files.push({ path: p }); memFiles[p] = body; log("create", p); return { path: p }; },
      createFolder: async (p) => log("createFolder", p),
      on: () => ({}),
      adapter: {
        exists: async (p) => p in memFiles || p.endsWith("/boards"),
        read: async (p) => memFiles[p],
        write: async (p, d) => { memFiles[p] = d; },
        mkdir: async () => {},
      },
    },

    metadataCache: {
      on: () => ({}),
      getFileCache: (f) => {
        const p = pages.find((x) => x.file.path === f.path);
        if (!p) return null;
        const fm = { tags: p.file.tags.map((t) => t.slice(1)) };
        if (p["一句话描述"]) fm["一句话描述"] = p["一句话描述"];
        return {
          frontmatter: fm,
          tags: p.file.tags.map((t) => ({ tag: t })),
          links: p.file.outlinks.map((l) => ({ link: l.path })),
          sections: [{ type: "code" }],
          listItems: p.file.tasks.map((t, i) => ({
            task: t.completed ? "x" : " ",
            position: { start: { line: t.line ?? i } },
          })),
        };
      },
      // { 源文件: { 目标文件: 次数 } } —— 原生层从这里反转出反链
      get resolvedLinks() {
        const out = {};
        for (const p of pages) {
          for (const l of p.file.inlinks) {
            out[l.path] = out[l.path] || {};
            out[l.path][p.file.path] = 1;
          }
        }
        // 前 6 张图算被引用过，其余的留给「无人引用」
        const host = pages[0]?.file.path || "note.md";
        out[host] = out[host] || {};
        for (let i = 0; i < 6; i++) out[host][`assets/图片-${i}.png`] = 1;
        return out;
      },
    },

    workspace: {
      // 「最近打开」用的是 Obsidian 自己维护的列表，不是修改时间
      getLastOpenFiles: () => pages.slice(3, 20).map((p) => p.file.path),
      openLinkText: (p) => log("openLinkText", p),
      getLeaf: () => ({ openFile: async (f) => log("openFile", f.path) }),
      trigger: () => {},
    },
    commands: { executeCommandById: (id) => log("command", id) },
    internalPlugins: {
      getPluginById: (id) =>
        id === "global-search"
          ? { instance: { openGlobalSearch: (q) => log("search", q) } }
          : id === "bookmarks"
          ? { instance: { getBookmarks: () => [
              { type: "file", path: "01.notes/注意力机制-3.md", title: "注意力机制" },
              { type: "group", title: "写作", items: [{ type: "search", query: "tag:#todo", title: "待办搜索" }] },
            ] } }
          : null,
    },
  };
  return app;
}
