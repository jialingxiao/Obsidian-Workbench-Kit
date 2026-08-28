/* 组件 · untagged 待整理
 * 缺标签、缺摘要、或者还很短的笔记 —— 一个「该收拾了」清单。
 * 比单纯的「无标签」更有用：整理这件事的触发点不止一种。 */
(WB) => ({
  meta: {
    id: "untagged",
    group: "notes",
    name: { zh: "待整理", en: "Needs Attention" },
    desc: { zh: "缺标签 / 缺指定字段 / 内容过短的笔记", en: "Notes missing tags, a field, or still too short" },
    props: {
      source:      { type: "path",   default: "",  desc: "范围，支持 @别名" },
      rule:        { type: "enum",   default: "untagged", options: ["untagged", "noField", "short"], desc: "判定规则" },
      field:       { type: "text",   default: "一句话描述", desc: "noField 规则要检查的字段名" },
      minLength:   { type: "number", default: 200, desc: "short 规则的字数下限" },
      limit:       { type: "number", default: 8,   desc: "最多显示几条" },
      label:       { type: "text",   default: "",  desc: "分区标题" },
    },
    layout: { w: 5, h: 7 },
    demo: { label: "待整理", rule: "untagged", limit: 6 },
  },

  async render({ el, dv, app, props, h, q, ui, i18n, empty }) {
    const pages = q.pages(dv, props.source);
    const rule = props.rule || "untagged";
    let hits = [];

    if (rule === "untagged") {
      hits = pages.filter((p) => {
        const tags = (p.file && p.file.tags) || [];
        const arr = tags.array ? tags.array() : tags;
        return !arr || arr.length === 0;
      });
    } else if (rule === "noField") {
      const names = String(props.field || "").split(",").map((s) => s.trim()).filter(Boolean);
      hits = names.length ? pages.filter((p) => q.field(p, ...names) == null) : [];
    } else {
      const min = Math.max(1, Number(props.minLength) || 200);
      // cachedRead 走 Obsidian 的缓存，比逐个读盘快得多
      for (const p of pages) {
        const f = app.vault.getAbstractFileByPath(p.file.path);
        if (!f) continue;
        try {
          const md = await app.vault.cachedRead(f);
          if (md.replace(/^---[\s\S]*?---/, "").trim().length < min) hits.push(p);
        } catch (e) { /* 读不了就跳过 */ }
      }
    }

    hits.sort((a, b) => {
      const ta = q.timeOf(a, "mtime"), tb = q.timeOf(b, "mtime");
      return ((tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0))
        || a.file.path.localeCompare(b.file.path);   // 时间相同时按路径兜底
    });
    const rows = hits.slice(0, Math.max(1, Math.min(40, Number(props.limit) || 8)));

    const box = h("div.wb-untagged");
    const head = ui.head(props.label, `${hits.length} / ${pages.length}`);
    if (head) box.appendChild(head);

    if (!rows.length) {
      const done = { untagged: "每篇笔记都有标签了", noField: `每篇都填了「${props.field}」`, short: "没有过短的笔记" };
      box.appendChild(empty(done[rule] || "没有需要整理的笔记", "干净"));
      el.appendChild(box);
      return;
    }

    box.appendChild(
      ui.noteList(rows.map((p) => ({
        path: p.file.path,
        name: p.file.name,
        sub: p.file.path.includes("/") ? p.file.path.replace(/\/[^/]+$/, "") : null,
        meta: i18n.fromNow(q.timeOf(p, "mtime")),
      })))
    );
    el.appendChild(box);
  },
})
