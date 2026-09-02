/* 组件 · orphans 孤岛笔记
 * 没有任何笔记链接过来的笔记。知识库里最容易被遗忘的就是这批 ——
 * 把它们摆到首页，才有机会被重新接回网络里。 */
(WB) => ({
  meta: {
    id: "orphans",
    group: "notes",
    name: { zh: "孤岛笔记", en: "Orphans" },
    desc: { zh: "没有任何反向链接的笔记，容易被遗忘的那批", en: "Notes nothing links to — the easily forgotten ones" },
    props: {
      source:      { type: "path",   default: "",     desc: "范围，支持 @别名" },
      limit:       { type: "number", default: 8,      desc: "最多显示几条" },
      alsoNoLinks: { type: "bool",   default: false,  desc: "同时要求它自己也没有出链（完全孤立）" },
      sort:        { type: "enum",   default: "ctime", options: ["ctime", "mtime", "random"], desc: "排序方式" },
      label:       { type: "text",   default: "",     desc: "分区标题" },
    },
    layout: { w: 10, h: 14 },
    demo: { label: "孤岛笔记", limit: 6 },
  },

  async render({ el, dv, props, h, q, ui, i18n, empty }) {
    const pages = q.pages(dv, props.source);

    const orphans = pages.filter((p) => {
      const inbound = p.file.inlinks;
      const nIn = inbound ? (inbound.length ?? (inbound.array ? inbound.array().length : 0)) : 0;
      if (nIn > 0) return false;
      if (!props.alsoNoLinks) return true;
      const outbound = p.file.outlinks;
      const nOut = outbound ? (outbound.length ?? (outbound.array ? outbound.array().length : 0)) : 0;
      return nOut === 0;
    });

    if (props.sort === "random") orphans.sort(() => Math.random() - 0.5);
    else {
      const f = props.sort === "mtime" ? "mtime" : "ctime";
      orphans.sort((a, b) => {
        const ta = q.timeOf(a, f), tb = q.timeOf(b, f);
        return ((tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0))
          || a.file.path.localeCompare(b.file.path);   // 时间相同时按路径兜底
      });
    }

    const rows = orphans.slice(0, Math.max(1, Math.min(40, Number(props.limit) || 8)));

    const box = h("div.wb-orphans");
    const head = ui.head(props.label, `${orphans.length} / ${pages.length}`);
    if (head) box.appendChild(head);

    if (!rows.length) {
      box.appendChild(empty("没有孤岛笔记", "每篇笔记都至少被链接过一次 —— 挺好的"));
      el.appendChild(box);
      return;
    }

    box.appendChild(
      ui.noteList(rows.map((p) => ({
        path: p.file.path,
        name: p.file.name,
        sub: p.file.path.includes("/") ? p.file.path.replace(/\/[^/]+$/, "") : null,
        meta: i18n.fromNow(q.timeOf(p, "ctime")),
      })))
    );
    el.appendChild(box);
  },
})
