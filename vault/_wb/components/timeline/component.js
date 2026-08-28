/* 组件 · timeline 时间线
 * 按日期把笔记排成一条竖轴，同一天的归成一组。日志、项目、读书记录
 * 这类库，时间线往往比列表更接近你脑子里的结构。
 *
 * 日期优先取指定的 frontmatter 字段，取不到再退回文件时间 —— 这样
 * 「事情发生的日期」和「笔记写下的日期」不一致时，以前者为准。 */
(WB) => {
  function dateOf(q, p, fields, fallback) {
    for (const name of fields) {
      const v = p[name];
      if (v == null || v === "") continue;
      const d = v instanceof Date ? v : (v.toJSDate ? v.toJSDate() : new Date(String(v)));
      if (d && !isNaN(d)) return d;
    }
    return q.timeOf(p, fallback);
  }

  return {
    meta: {
      id: "timeline",
      group: "notes",
      name: { zh: "时间线", en: "Timeline" },
      desc: {
        zh: "按日期排成一条竖轴，同一天的归成一组",
        en: "Notes on a vertical time axis, grouped by day",
      },
      props: {
        source:    { type: "path",   default: "",      desc: "范围，支持 @别名" },
        dateField: { type: "text",   default: "",      desc: "日期字段名，多个候选用逗号分隔。取不到则用文件时间" },
        fallback:  { type: "enum",   default: "ctime", options: ["ctime", "mtime"], desc: "取不到字段时用哪个时间" },
        limit:     { type: "number", default: 12,      desc: "最多显示几条" },
        order:     { type: "enum",   default: "desc",  options: ["desc", "asc"], desc: "新的在上还是旧的在上" },
        descField: { type: "text",   default: "",      desc: "摘要字段名" },
        label:     { type: "text",   default: "",      desc: "分区标题" },
      },
      layout: { w: 5, h: 8 },
      demo: { label: "时间线", limit: 10, descField: "一句话描述" },
    },

    async render({ el, dv, props, h, q, ui, link, i18n, empty }) {
      const fields = String(props.dateField || "").split(",").map((s) => s.trim()).filter(Boolean);
      const fallback = props.fallback === "mtime" ? "mtime" : "ctime";

      const rows = q
        .pages(dv, props.source)
        .map((p) => ({ p, d: dateOf(q, p, fields, fallback) }))
        .filter((r) => r.d)
        .sort((a, b) => (props.order === "asc" ? a.d - b.d : b.d - a.d)
          || a.p.file.path.localeCompare(b.p.file.path))
        .slice(0, Math.max(1, Math.min(60, Number(props.limit) || 12)));

      const box = h("div.wb-tl");
      const headEl = ui.head(props.label, rows.length ? `${rows.length} 条` : null);
      if (headEl) box.appendChild(headEl);

      if (!rows.length) {
        box.appendChild(empty("这个范围里没有可排期的笔记", props.source ? `范围：${props.source}` : ""));
        el.appendChild(box);
        return;
      }

      const line = h("div.wb-tl-line");
      let lastKey = "";
      for (const { p, d } of rows) {
        const key = q.dayKey(d);
        const sameDay = key === lastKey;
        lastKey = key;

        const item = h("div.wb-tl-item", { class: sameDay ? "is-same-day" : "" },
          h("div.wb-tl-date", { text: sameDay ? "" : i18n.formatDate(d) }),
          h("div.wb-tl-dot"),
          h("div.wb-tl-body")
        );
        const body = item.querySelector(".wb-tl-body");
        const t = link(p.file.path, p.file.name);
        t.classList.add("wb-tl-title");
        body.appendChild(t);
        const desc = ui.descOf(p, props.descField);
        if (desc) body.appendChild(h("div.wb-tl-desc", { text: desc }));
        line.appendChild(item);
      }

      box.appendChild(line);
      el.appendChild(box);
    },
  };
}
