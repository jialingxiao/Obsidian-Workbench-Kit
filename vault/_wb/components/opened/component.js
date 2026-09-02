/* 组件 · opened 最近打开
 * 和「最近笔记」不是一回事：那个按修改时间排，这个按你实际打开过的
 * 顺序。找回「我刚才在看什么」时，后者准得多 —— 读过但没改的笔记
 * 在修改时间里是看不见的。
 *
 * 数据来自 Obsidian 自己维护的最近文件列表，两种运行模式下都可用。 */
(WB) => ({
  meta: {
    id: "opened",
    group: "notes",
    name: { zh: "最近打开", en: "Recently Opened" },
    desc: {
      zh: "按你实际打开过的顺序列出笔记（≠ 最近修改）",
      en: "Notes in the order you actually opened them (not by mtime)",
    },
    props: {
      limit:     { type: "number", default: 8,  desc: "最多显示几条" },
      source:    { type: "path",   default: "", desc: "只看某个范围，支持 @别名。留空为全库" },
      skipFirst: { type: "number", default: 0,  desc: "跳过最前面几条（0 通常是当前这篇首页）" },
      showFolder:{ type: "bool",   default: true, desc: "显示所在文件夹" },
      label:     { type: "text",   default: "", desc: "分区标题" },
    },
    layout: { w: 10, h: 14 },
    demo: { label: "最近打开", limit: 7 },
  },

  async render({ el, app, props, h, ui, cfg, empty }) {
    const box = h("div.wb-op");
    const headEl = ui.head(props.label);
    if (headEl) box.appendChild(headEl);

    let recent = [];
    try {
      recent = app.workspace.getLastOpenFiles() || [];
    } catch (e) {
      // 老版本没有这个 API，给出可解释的空状态而不是空白
      box.appendChild(empty("当前 Obsidian 版本不支持最近打开列表", "换用「最近笔记」组件（按修改时间）"));
      el.appendChild(box);
      return;
    }

    const scope = cfg.path(props.source || "") || "";
    const prefix = scope ? scope.replace(/\/$/, "") + "/" : "";

    const rows = recent
      .slice(Math.max(0, Number(props.skipFirst) || 0))
      .filter((p) => p.endsWith(".md") && (!prefix || p.startsWith(prefix)))
      .filter((p) => app.vault.getAbstractFileByPath(p))   // 删掉的文件还留在列表里
      .slice(0, Math.max(1, Math.min(30, Number(props.limit) || 8)));

    if (!rows.length) {
      box.appendChild(empty("还没有打开过笔记", scope ? `范围：${props.source}` : "打开几篇再回来看"));
      el.appendChild(box);
      return;
    }

    box.appendChild(
      ui.noteList(rows.map((p, i) => ({
        path: p,
        name: p.split("/").pop().replace(/\.md$/, ""),
        sub: props.showFolder && p.includes("/") ? p.replace(/\/[^/]+$/, "") : null,
        meta: String(i + 1),
      })))
    );
    el.appendChild(box);
  },
})
