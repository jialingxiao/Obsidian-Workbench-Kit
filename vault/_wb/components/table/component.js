/* 组件 · table 表格
 * 自选字段当列的通用表格 —— 相当于 Dataview 的 TABLE，但列的定义是
 * 参数而不是查询语言，所以能用 ⚙ 表单改，也能在插件版里跑。
 *
 * 这是整套库里最「万能」的一块：任何「把这些笔记按这几个字段列出来」
 * 的需求都归它，不必为每种视角单独做一个组件。 */
(WB) => {
  /* 几个特殊列名走内置逻辑，其余一律当 frontmatter 字段取 */
  const BUILTIN = new Set(["file", "name", "path", "folder", "mtime", "ctime", "tags", "size"]);

  function cellOf(ctx, p, key) {
    const { q, i18n, link, h } = ctx;
    switch (key) {
      case "file":
      case "name":
        return link(p.file.path, p.file.name);
      case "path":
        return h("span.wb-tb-dim", { text: p.file.path });
      case "folder":
        return h("span.wb-tb-dim", { text: p.file.path.includes("/") ? p.file.path.replace(/\/[^/]+$/, "") : "/" });
      case "mtime":
      case "ctime": {
        const d = q.timeOf(p, key);
        return h("span.wb-tb-dim", { text: d ? i18n.fromNow(d) : "" });
      }
      case "tags": {
        const tags = p.file.tags || [];
        const arr = tags.array ? tags.array() : tags;
        return h("span.wb-tb-dim", { text: arr.join(" ") });
      }
      case "size":
        return h("span.wb-tb-dim.wb-num", { text: p.file.size ? `${Math.round(p.file.size / 1024)}K` : "" });
      default: {
        const v = q.field(p, key);
        if (v == null) return h("span.wb-tb-none", { text: "—" });
        if (Array.isArray(v)) return h("span", { text: v.join("、") });
        return h("span", { text: String(v) });
      }
    }
  }

  return {
    meta: {
      id: "table",
      group: "notes",
      name: { zh: "表格", en: "Table" },
      desc: {
        zh: "自选字段当列的通用表格，任何「按字段列出笔记」的需求都用它",
        en: "A general-purpose table: pick any frontmatter fields as columns",
      },
      props: {
        source:  { type: "path",   default: "",  desc: "范围，支持 @别名、#标签" },
        columns: {
          type: "array",
          default: ["file", "mtime"],
          desc: '列。写字段名即可，如 ["file","状态","mtime"]；也可写 [{field:"状态",label:"进度",width:"80px"}]。' +
                "内置列名：file / path / folder / mtime / ctime / tags / size",
        },
        sort:    { type: "text",   default: "mtime", desc: "排序字段，可用内置列名或任意 frontmatter 字段" },
        order:   { type: "enum",   default: "desc", options: ["desc", "asc"] },
        limit:   { type: "number", default: 10,  desc: "最多显示几行" },
        hasField:{ type: "text",   default: "",  desc: "只显示含有该字段的笔记" },
        compact: { type: "bool",   default: false, desc: "紧凑行高" },
        label:   { type: "text",   default: "",  desc: "分区标题" },
      },
      layout: { w: 16, h: 16 },
      demo: {
        label: "最近笔记",
        columns: ["file", "一句话描述", "mtime"],
        limit: 8,
      },
    },

    async render(ctx) {
      const { el, dv, props, h, q, ui, empty } = ctx;

      const cols = (Array.isArray(props.columns) ? props.columns : ["file"])
        .map((c) => (typeof c === "string" ? { field: c } : c))
        .filter((c) => c && c.field);

      let pages = q.pages(dv, props.source);
      if (props.hasField) {
        const names = String(props.hasField).split(",").map((s) => s.trim()).filter(Boolean);
        pages = pages.filter((p) => q.field(p, ...names) != null);
      }

      // 排序：内置的时间列走 timeOf，其余按字段值比较
      const key = props.sort || "mtime";
      const valOf = (p) => {
        if (key === "mtime" || key === "ctime") return q.timeOf(p, key)?.getTime() ?? 0;
        if (key === "name" || key === "file") return p.file.name;
        if (key === "path") return p.file.path;
        const v = q.field(p, key);
        return v == null ? "" : v;
      };
      pages.sort((a, b) => {
        const va = valOf(a), vb = valOf(b);
        if (typeof va === "number" && typeof vb === "number") return vb - va;
        return String(vb).localeCompare(String(va));
      });
      if (props.order === "asc") pages.reverse();

      const rows = pages.slice(0, Math.max(1, Math.min(200, Number(props.limit) || 10)));

      const box = h("div.wb-tb");
      const head = ui.head(props.label, rows.length ? `${rows.length} / ${pages.length}` : null);
      if (head) box.appendChild(head);

      if (!rows.length) {
        box.appendChild(empty("没有符合条件的笔记", props.source ? `范围：${props.source}` : "试试放宽过滤条件"));
        el.appendChild(box);
        return;
      }

      const table = h("table.wb-tb-table", { class: props.compact ? "is-compact" : "" });
      const thead = h("thead");
      const tr = h("tr");
      for (const c of cols) {
        tr.appendChild(h("th", { style: c.width ? { width: c.width } : null, text: c.label || c.field }));
      }
      thead.appendChild(tr);
      table.appendChild(thead);

      const tbody = h("tbody");
      for (const p of rows) {
        const line = h("tr");
        for (const c of cols) line.appendChild(h("td", null, cellOf(ctx, p, c.field)));
        tbody.appendChild(line);
      }
      table.appendChild(tbody);

      // 列多了要能横向滚，但只在表格自己内部滚，不撑破块
      box.appendChild(h("div.wb-tb-scroll", null, table));
      el.appendChild(box);
    },
  };
}
