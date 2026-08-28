/* 组件 · on-this-day 那年今日
 * 往年的今天写下的笔记。零配置 —— 用的全是已有的创建时间。
 * 库用得越久这块越有意思，是整套组件里「惊喜感」最高的一个。 */
(WB) => ({
  meta: {
    id: "on-this-day",
    group: "notes",
    name: { zh: "那年今日", en: "On This Day" },
    desc: {
      zh: "往年今天创建的笔记，库用得越久越有意思",
      en: "Notes written on this day in previous years",
    },
    props: {
      source:    { type: "path",   default: "",      desc: "范围，支持 @别名" },
      field:     { type: "enum",   default: "ctime", options: ["ctime", "mtime"], desc: "按创建还是修改时间" },
      window:    { type: "number", default: 0,       desc: "前后几天也算（0 = 只看当天）" },
      limit:     { type: "number", default: 6,       desc: "最多显示几条" },
      descField: { type: "text",   default: "",      desc: "摘要字段名" },
      label:     { type: "text",   default: "",      desc: "分区标题" },
    },
    layout: { w: 5, h: 6 },
    demo: { label: "那年今日", window: 3, limit: 5 },
  },

  async render({ el, dv, props, h, q, ui, i18n, empty }) {
    const today = ui.today();
    const thisYear = today.getFullYear();
    const win = Math.max(0, Math.min(15, Number(props.window) || 0));

    /* 只比月日，不比年。跨年的窗口（12/30 看 1/2）用「距今天多少天」
     * 来判断，比直接比月日省事也不会漏。 */
    const nearToday = (d) => {
      const anniversary = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.round((anniversary - today) / 86400000);
      const wrapped = Math.min(Math.abs(diff), 365 - Math.abs(diff));
      return wrapped <= win;
    };

    const rows = q
      .pages(dv, props.source)
      .map((p) => ({ p, d: q.timeOf(p, props.field === "mtime" ? "mtime" : "ctime") }))
      .filter((r) => r.d && r.d.getFullYear() < thisYear && nearToday(r.d))
      .sort((a, b) => b.d - a.d || a.p.file.path.localeCompare(b.p.file.path))
      .slice(0, Math.max(1, Math.min(30, Number(props.limit) || 6)));

    const box = h("div.wb-otd");
    const headEl = ui.head(props.label, rows.length ? `${rows.length} 篇` : null);
    if (headEl) box.appendChild(headEl);

    if (!rows.length) {
      box.appendChild(empty(
        "往年的今天还没有笔记",
        win ? `已包含前后 ${win} 天` : "把 window 调大一点可以放宽到前后几天"
      ));
      el.appendChild(box);
      return;
    }

    box.appendChild(
      ui.noteList(rows.map(({ p, d }) => ({
        path: p.file.path,
        name: p.file.name,
        desc: ui.descOf(p, props.descField),
        meta: `${thisYear - d.getFullYear()} 年前`,
        sub: i18n.formatDate(d),
      })))
    );
    el.appendChild(box);
  },
})
