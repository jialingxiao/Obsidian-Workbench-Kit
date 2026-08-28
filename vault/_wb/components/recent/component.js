/* 组件 · recent 最近笔记
 * 按创建或修改时间排序的笔记列表，带相对时间。 */
(WB) => ({
  meta: {
    id: "recent",
    group: "notes",
    name: { zh: "最近笔记", en: "Recent Notes" },
    desc: {
      zh: "按修改或创建时间列出最近的笔记",
      en: "Most recently modified or created notes",
    },
    props: {
      source:     { type: "path",   default: "",      desc: "范围，留空为全库，支持 @别名" },
      field:      { type: "enum",   default: "mtime", options: ["mtime", "ctime"], desc: "按修改还是创建时间排序" },
      limit:      { type: "number", default: 8,       desc: "最多显示几条" },
      label:      { type: "text",   default: "",      desc: "分区标题" },
      showTime:   { type: "bool",   default: true,    desc: "右侧显示相对时间" },
      showFolder: { type: "bool",   default: false,   desc: "标题下显示所在文件夹" },
      descField:  { type: "text",   default: "",      desc: "用作摘要的 frontmatter 字段名，如 一句话描述" },
    },
    layout: { w: 5, h: 8 },
    demo: { label: "最近更新", limit: 6, showFolder: true },
  },

  async render({ el, dv, props, h, q, link, i18n, empty }) {
    const limit = Math.max(1, Math.min(50, Number(props.limit) || 8));
    const field = props.field === "ctime" ? "ctime" : "mtime";

    const rows = q
      .pages(dv, props.source)
      .map((p) => ({ p, t: q.timeOf(p, field) }))
      .filter((r) => r.t)
      // 时间相同时按路径兜底，顺序才稳定
      .sort((a, b) => b.t - a.t || a.p.file.path.localeCompare(b.p.file.path))
      .slice(0, limit);

    const box = h("div.wb-recent");
    if (props.label) {
      box.appendChild(
        h("div.wb-head", null,
          h("span.wb-head-label", { text: props.label }),
          h("span.wb-head-meta", { text: `${rows.length}` })
        )
      );
    }

    if (!rows.length) {
      box.appendChild(empty("这个范围里还没有笔记", props.source ? `范围：${props.source}` : ""));
      el.appendChild(box);
      return;
    }

    const list = h("ul.wb-recent-list");
    for (const { p, t } of rows) {
      const folder = p.file.path.includes("/") ? p.file.path.replace(/\/[^/]+$/, "") : "";
      const desc = props.descField ? q.field(p, props.descField) : null;

      list.appendChild(
        h("li.wb-recent-item", null,
          h("div.wb-recent-main", null,
            link(p.file.path, p.file.name),
            desc ? h("div.wb-recent-desc", { text: String(desc) }) : null,
            props.showFolder && folder ? h("div.wb-recent-folder", { text: folder }) : null
          ),
          props.showTime ? h("div.wb-recent-time", { text: i18n.fromNow(t) }) : null
        )
      );
    }
    box.appendChild(list);
    el.appendChild(box);
  },
})
