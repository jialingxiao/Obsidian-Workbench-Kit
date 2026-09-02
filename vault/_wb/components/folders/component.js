/* 组件 · folders 文件夹导航
 * 列出某一层的文件夹和各自的笔记数，点了直接打开该文件夹。 */
(WB) => ({
  meta: {
    id: "folders",
    group: "nav",
    name: { zh: "文件夹导航", en: "Folders" },
    desc: { zh: "列出文件夹及各自的笔记数，点击直达", en: "Folders with note counts, click to open" },
    props: {
      source:  { type: "path",   default: "",     desc: "根目录，留空为库根，支持 @别名" },
      style:   { type: "enum",   default: "list", options: ["list", "chip"], desc: "list 带数量列表，chip 紧凑胶囊" },
      limit:   { type: "number", default: 12,     desc: "最多显示几个" },
      sort:    { type: "enum",   default: "count", options: ["count", "name"], desc: "按数量还是名称排序" },
      label:   { type: "text",   default: "",     desc: "分区标题" },
    },
    layout: { w: 8, h: 14 },
    demo: { label: "目录" },
  },

  async render({ el, dv, app, props, h, q, ui, empty, cfg }) {
    const base = cfg.path(props.source || "") || "";
    const prefix = base ? base.replace(/\/$/, "") + "/" : "";

    let rows = q.subfolders(app, props.source || "").map((name) => ({
      label: name,
      path: prefix + name,
      n: q.count(dv, prefix + name),
    }));

    rows = rows.filter((r) => r.n > 0);
    rows.sort((a, b) => (props.sort === "name" ? a.label.localeCompare(b.label) : b.n - a.n));
    rows = rows.slice(0, Math.max(1, Math.min(50, Number(props.limit) || 12)));

    const box = h("div.wb-folders");
    const head = ui.head(props.label, rows.length ? `${rows.length} 个` : null);
    if (head) box.appendChild(head);

    if (!rows.length) {
      box.appendChild(empty("这里没有子文件夹", base ? `范围：${base}` : "库根目录下还没有分文件夹"));
      el.appendChild(box);
      return;
    }

    if (props.style === "chip") {
      box.appendChild(
        ui.chips(rows.map((r) => ({
          label: r.label,
          n: r.n,
          onClick: () => app.workspace.openLinkText(r.path, "", false),
        })))
      );
    } else {
      box.appendChild(ui.bars(rows.map((r) => ({ label: r.label, n: r.n, path: r.path }))));
    }

    el.appendChild(box);
  },
})
