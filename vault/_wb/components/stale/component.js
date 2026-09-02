/* 组件 · stale 久未回顾
 * 很久没动过的笔记。和 orphans（没人链接）、untagged（缺元数据）凑成
 * 「整理三件套」—— 分别从连接、元数据、时间三个角度找被冷落的笔记。 */
(WB) => ({
  meta: {
    id: "stale",
    group: "notes",
    name: { zh: "久未回顾", en: "Stale Notes" },
    desc: {
      zh: "超过一段时间没有改动过的笔记，提醒你回头看看",
      en: "Notes untouched for a while — worth revisiting",
    },
    props: {
      source:    { type: "path",   default: "",      desc: "范围，支持 @别名" },
      months:    { type: "number", default: 6,       desc: "多久没动算「久」（月）" },
      field:     { type: "enum",   default: "mtime", options: ["mtime", "ctime"], desc: "按修改还是创建时间" },
      limit:     { type: "number", default: 8,       desc: "最多显示几条" },
      oldest:    { type: "bool",   default: true,    desc: "最久的排前面（关掉则最近的在前）" },
      descField: { type: "text",   default: "",      desc: "摘要字段名" },
      label:     { type: "text",   default: "",      desc: "分区标题" },
    },
    layout: { w: 10, h: 14 },
    demo: { label: "久未回顾", months: 3, limit: 6 },
  },

  async render({ el, dv, props, h, q, ui, i18n, empty }) {
    const months = Math.max(1, Math.min(120, Number(props.months) || 6));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const field = props.field === "ctime" ? "ctime" : "mtime";

    const all = q.pages(dv, props.source);
    const rows = all
      .map((p) => ({ p, d: q.timeOf(p, field) }))
      .filter((r) => r.d && r.d < cutoff)
      .sort((a, b) => (props.oldest ? a.d - b.d : b.d - a.d) || a.p.file.path.localeCompare(b.p.file.path))
      .slice(0, Math.max(1, Math.min(40, Number(props.limit) || 8)));

    const box = h("div.wb-stale");
    const headEl = ui.head(props.label, `${rows.length ? "" : "0 / "}${all.length} 篇中`);
    if (headEl) box.appendChild(headEl);

    if (!rows.length) {
      box.appendChild(empty(`没有超过 ${months} 个月没动的笔记`, "都挺新鲜"));
      el.appendChild(box);
      return;
    }

    box.appendChild(
      ui.noteList(rows.map(({ p, d }) => ({
        path: p.file.path,
        name: p.file.name,
        desc: ui.descOf(p, props.descField),
        sub: p.file.path.includes("/") ? p.file.path.replace(/\/[^/]+$/, "") : null,
        meta: i18n.fromNow(d),
      })))
    );
    el.appendChild(box);
  },
})
