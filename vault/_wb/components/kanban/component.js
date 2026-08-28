/* 组件 · kanban 分列看板
 * 按某个 frontmatter 字段把笔记分列。把「字段」变成「流程」——
 * 库里已经写了 status: 进行中 的话，这个组件不需要任何额外配置。
 *
 * 刻意只读不写：拖卡片改字段听起来很美，但那要改用户笔记的 frontmatter，
 * 一旦格式不合预期就会毁掉整个文件头。留给以后想清楚再说。 */
(WB) => ({
  meta: {
    id: "kanban",
    group: "tasks",
    name: { zh: "分列看板", en: "Kanban" },
    desc: {
      zh: "按某个 frontmatter 字段把笔记分成几列，比如按 status 看进度",
      en: "Group notes into columns by a frontmatter field, e.g. status",
    },
    props: {
      source:   { type: "path",   default: "",       desc: "范围，支持 @别名" },
      field:    { type: "text",   default: "status", desc: "用来分列的字段名，多个候选用逗号分隔。填 folder 则按文件夹分列" },
      columns:  { type: "array",  default: [],       desc: '列的顺序，如 ["待办","进行中","已完成"]。留空则自动取该字段出现过的值' },
      limit:    { type: "number", default: 6,        desc: "每列最多显示几张卡片" },
      showEmpty:{ type: "bool",   default: false,    desc: "显示没有卡片的列" },
      descField:{ type: "text",   default: "",       desc: "卡片副标题取哪个字段" },
      label:    { type: "text",   default: "",       desc: "分区标题" },
    },
    layout: { w: 12, h: 8 },
    demo: {
      label: "进度",
      field: "folder",
      limit: 3,
    },
  },

  async render({ el, dv, props, h, q, ui, link, empty }) {
    const names = String(props.field || "status").split(",").map((s) => s.trim()).filter(Boolean);
    const pages = q.pages(dv, props.source);

    /* folder 是内置分列依据：很多库根本没写 status 这类字段，
       但「按文件夹分列」立刻就能用，不需要先去改一遍 frontmatter。 */
    const byFolder = names[0] === "folder";

    const buckets = new Map();
    let unset = 0;
    for (const p of pages) {
      const v = byFolder
        ? (p.file.path.includes("/") ? p.file.path.replace(/\/[^/]+$/, "") : "/")
        : q.field(p, ...names);
      if (v == null) { unset++; continue; }
      const key = Array.isArray(v) ? String(v[0]) : String(v);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(p);
    }

    // 指定了列顺序就按它排，否则按卡片多的在前
    let order = Array.isArray(props.columns) && props.columns.length
      ? props.columns.map(String)
      : [...buckets.keys()].sort((a, b) => (buckets.get(b)?.length || 0) - (buckets.get(a)?.length || 0));
    if (!props.showEmpty) order = order.filter((k) => (buckets.get(k) || []).length);

    const box = h("div.wb-kb");
    const head = ui.head(props.label, buckets.size ? `${pages.length - unset} / ${pages.length} 已分类` : null);
    if (head) box.appendChild(head);

    if (!order.length) {
      box.appendChild(empty(
        `没有笔记填写了「${names[0]}」字段`,
        "在笔记的 frontmatter 里加上这个字段，它们就会自动分列"
      ));
      el.appendChild(box);
      return;
    }

    const limit = Math.max(1, Math.min(50, Number(props.limit) || 6));
    const grid = h("div.wb-kb-cols", { style: { "--wb-kb-n": String(order.length) } });

    for (const key of order) {
      const items = buckets.get(key) || [];
      const col = h("div.wb-kb-col", null,
        h("div.wb-kb-head", null,
          h("span.wb-kb-name", { text: key }),
          h("span.wb-kb-n.wb-num", { text: String(items.length) })
        )
      );
      for (const p of items.slice(0, limit)) {
        const card = h("div.wb-kb-card");
        const t = link(p.file.path, p.file.name);
        t.classList.add("wb-kb-title");
        card.appendChild(t);
        const d = props.descField ? ui.descOf(p, props.descField) : null;
        if (d) card.appendChild(h("div.wb-kb-desc", { text: d }));
        col.appendChild(card);
      }
      if (items.length > limit) {
        col.appendChild(h("div.wb-kb-more", { text: `还有 ${items.length - limit} 张` }));
      }
      grid.appendChild(col);
    }

    box.appendChild(grid);
    el.appendChild(box);
  },
})
