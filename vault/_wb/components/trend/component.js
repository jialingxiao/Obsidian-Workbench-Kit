/* 组件 · trend 增长趋势
 * 按周或按月统计新增笔记，画成柱状图。热力图看的是「有没有在写」，
 * 这个看的是「写得多不多」。 */
(WB) => {
  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }
  function toMonday(d) {
    const dow = d.getDay();
    return addDays(d, dow === 0 ? -6 : 1 - dow);
  }

  return {
    meta: {
      id: "trend",
      group: "metrics",
      name: { zh: "增长趋势", en: "Trend" },
      desc: { zh: "按周或按月统计新增笔记的柱状图", en: "Bar chart of notes added per week or month" },
      props: {
        source:    { type: "path",   default: "",      desc: "统计范围，支持 @别名" },
        field:     { type: "enum",   default: "ctime", options: ["ctime", "mtime"], desc: "按创建还是修改时间" },
        unit:      { type: "enum",   default: "week",  options: ["week", "month"], desc: "按周还是按月" },
        periods:   { type: "number", default: 12,      desc: "显示最近几期" },
        showValue: { type: "bool",   default: true,    desc: "柱子上显示数字" },
        label:     { type: "text",   default: "",      desc: "分区标题" },
      },
      layout: { w: 7, h: 6 },
      demo: { label: "近 12 周新增", periods: 12 },
    },

    async render({ el, dv, props, h, q, ui, empty, i18n }) {
      const n = Math.max(3, Math.min(36, Number(props.periods) || 12));
      const field = props.field === "mtime" ? "mtime" : "ctime";
      const byMonth = props.unit === "month";

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 先算出每一期的起点和标签
      const buckets = [];
      for (let i = n - 1; i >= 0; i--) {
        if (byMonth) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: i18n.monthShort(d.getMonth()), n: 0 });
        } else {
          const d = toMonday(addDays(today, -i * 7));
          buckets.push({ key: q.dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, n: 0 });
        }
      }
      const index = new Map(buckets.map((b, i) => [b.key, i]));

      for (const p of q.pages(dv, props.source)) {
        const d = q.timeOf(p, field);
        if (!d) continue;
        const key = byMonth
          ? `${d.getFullYear()}-${d.getMonth()}`
          : q.dayKey(toMonday(new Date(d.getFullYear(), d.getMonth(), d.getDate())));
        const i = index.get(key);
        if (i !== undefined) buckets[i].n++;
      }

      const total = buckets.reduce((s, b) => s + b.n, 0);
      const box = h("div.wb-trend");
      const head = ui.head(props.label, total ? `共 ${total} 篇` : null);
      if (head) box.appendChild(head);

      if (!total) {
        box.appendChild(empty("这段时间没有新增笔记", props.source ? `范围：${props.source}` : ""));
        el.appendChild(box);
        return;
      }

      box.appendChild(ui.columns(buckets, { showValue: !!props.showValue }));
      el.appendChild(box);
    },
  };
}
