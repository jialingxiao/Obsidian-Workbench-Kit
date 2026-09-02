/* 组件 · heatmap 活动热力图
 * 按天统计笔记的创建/修改数量，画成 GitHub 式的周网格。 */
(WB) => {
  const LEVELS = [0, 1, 2, 4, 7]; // 图例档位，同时也是配色分级的阈值

  /* 用 new Date(y, m, d+n) 而不是加毫秒：跨夏令时不会漂一小时 */
  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  /* 回退到本周一（周一为一周之首，与 ISO 一致） */
  function toMonday(d) {
    const dow = d.getDay(); // 0=周日
    return addDays(d, dow === 0 ? -6 : 1 - dow);
  }

  function level(n) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    if (n <= 3) return 2;
    if (n <= 6) return 3;
    return 4;
  }

  /* 双色阶梯：低频用次强调色，高频用主强调色。
   * 单色叠透明度的梯子看起来很平 —— 五档全是同一个色相，只有深浅之分。
   * 两个色相之间过渡，疏密一眼就分得出来。
   *
   * 刻意不用 color-mix()：它要 Chromium 111+，老一点的 Obsidian 上
   * 整个格子会没有背景色。用「换色 + 透明度」两段式，任何版本都稳。 */
  const RAMP = [
    { v: "var(--wb-heat-empty)", o: "1" },
    { v: "var(--wb-accent-2)",   o: "0.45" },
    { v: "var(--wb-accent-2)",   o: "0.85" },
    { v: "var(--wb-accent)",     o: "0.75" },
    { v: "var(--wb-accent)",     o: "1" },
  ];

  function cellStyle(n) {
    const step = RAMP[level(n)];
    return { background: step.v, opacity: step.o };
  }

  return {
    meta: {
      id: "heatmap",
      group: "metrics",
      name: { zh: "活动热力图", en: "Activity Heatmap" },
      desc: {
        zh: "按天统计笔记数量的周网格，默认统计最近 52 周",
        en: "Weekly grid of daily note counts, last 52 weeks by default",
      },
      props: {
        source:     { type: "path",   default: "",       desc: "统计范围，留空为全库，支持 @别名" },
        field:      { type: "enum",   default: "ctime",  options: ["ctime", "mtime"], desc: "按创建时间还是修改时间统计" },
        weeks:      { type: "number", default: 52,       desc: "显示多少周" },
        label:      { type: "text",   default: "",       desc: "分区标题，留空用默认文案" },
        showStats:  { type: "bool",   default: true,     desc: "右上角显示活跃天数与总数" },
        showLegend: { type: "bool",   default: true,     desc: "显示 少—多 图例" },
        showMonths: { type: "bool",   default: true,     desc: "显示月份标签" },
      },
      layout: { w: 10, h: 10 },
      demo: { weeks: 26 },
    },

    async render({ el, dv, props, h, q, t, i18n }) {
      const weeksWanted = Math.max(4, Math.min(60, Number(props.weeks) || 52));
      const field = props.field === "mtime" ? "mtime" : "ctime";

      const pages = q.pages(dv, props.source);
      const tally = q.tallyByDay(pages, field);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = toMonday(addDays(today, -(weeksWanted - 1) * 7));

      // ── 构建周列 ──
      const cols = [];
      let cur = start;
      let activeDays = 0;
      let total = 0;
      while (cur <= today) {
        const col = [];
        for (let i = 0; i < 7; i++) {
          const key = q.dayKey(cur);
          const future = cur > today;
          const count = future ? 0 : tally[key] || 0;
          if (count > 0) {
            activeDays++;
            total += count;
          }
          col.push({ key, count, future, date: cur });
          cur = addDays(cur, 1);
        }
        cols.push(col);
      }

      const box = h("div.wb-hm");

      // ── 标题栏 ──
      if (props.label || props.showStats) {
        box.appendChild(
          h("div.wb-head", null,
            h("span.wb-head-label", { text: props.label || t("heatmap.label") }),
            props.showStats
              ? h("span.wb-head-meta", {
                  text: `${t("heatmap.days", { n: activeDays })} · ${t("heatmap.total", { n: total })}`,
                })
              : null
          )
        );
      }

      // ── 网格（横向可滚，窄侧栏里不会挤爆）──
      const scroller = h("div.wb-hm-scroll");
      const inner = h("div.wb-hm-inner");

      if (props.showMonths) {
        const months = h("div.wb-hm-months");
        cols.forEach((col, i) => {
          const m = col[0].date.getMonth();
          const prev = i > 0 ? cols[i - 1][0].date.getMonth() : -1;
          months.appendChild(h("div.wb-hm-month", { text: m !== prev ? i18n.monthShort(m) : "" }));
        });
        inner.appendChild(months);
      }

      const grid = h("div.wb-hm-grid");
      for (const col of cols) {
        const week = h("div.wb-hm-week");
        for (const day of col) {
          week.appendChild(
            day.future
              ? h("div.wb-hm-cell.is-future")
              : h("div.wb-hm-cell", {
                  style: cellStyle(day.count),
                  title: day.count ? `${day.key} · ${t("heatmap.notes", { n: day.count })}` : day.key,
                })
          );
        }
        grid.appendChild(week);
      }
      inner.appendChild(grid);
      scroller.appendChild(inner);
      box.appendChild(scroller);

      // ── 图例 ──
      if (props.showLegend) {
        const legend = h("div.wb-hm-legend", null, h("span", { text: t("heatmap.less") }));
        for (const n of LEVELS) legend.appendChild(h("div.wb-hm-cell", { style: cellStyle(n) }));
        legend.appendChild(h("span", { text: t("heatmap.more") }));
        box.appendChild(legend);
      }

      el.appendChild(box);
    },
  };
}
