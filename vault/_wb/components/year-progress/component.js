/* 组件 · year-progress 时间进度
 * 「2026 已过去 65%」。装饰性的，但看一眼就有推力 —— 比任何待办清单
 * 都更能说明「时间在走」。可以切成年/季/月/周。 */
(WB) => {
  function span(unit, now) {
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    switch (unit) {
      case "month":
        return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1), label: `${m + 1} 月` };
      case "quarter": {
        const q = Math.floor(m / 3);
        return { start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 1), label: `第 ${q + 1} 季度` };
      }
      case "week": {
        // 周一为一周之首
        const dow = now.getDay();
        const start = new Date(y, m, d - (dow === 0 ? 6 : dow - 1));
        return { start, end: new Date(y, m, start.getDate() + 7), label: "本周" };
      }
      default:
        return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), label: String(y) };
    }
  }

  return {
    meta: {
      id: "year-progress",
      group: "decor",
      name: { zh: "时间进度", en: "Time Progress" },
      desc: { zh: "今年（或本季/本月/本周）已经过去多少", en: "How much of the year, quarter, month or week has passed" },
      props: {
        unit:  { type: "enum", default: "year", options: ["year", "quarter", "month", "week"], desc: "统计单位" },
        style: { type: "enum", default: "bar",  options: ["bar", "dots"], desc: "bar 进度条，dots 点阵（一格一天）" },
        label: { type: "text", default: "",     desc: "标题，留空自动显示年份或月份" },
      },
      layout: { w: 8, h: 6 },
      demo: { unit: "year" },
    },

    async render({ el, props, h }) {
      const now = new Date();
      const { start, end, label } = span(props.unit, now);
      const total = end - start;
      const passed = now - start;
      const pct = Math.max(0, Math.min(100, (passed / total) * 100));

      const days = Math.round(total / 86400000);
      const daysPassed = Math.floor(passed / 86400000);

      const box = h("div.wb-yp");
      box.appendChild(h("div.wb-yp-top", null,
        h("span.wb-yp-label", { text: props.label || label }),
        h("span.wb-yp-pct.wb-num", { text: `${pct.toFixed(1)}%` })
      ));

      if (props.style === "dots") {
        // 一天一格。年视图 365 格在窄块里也排得下，密度本身就是表达
        const grid = h("div.wb-yp-dots");
        for (let i = 0; i < days; i++) {
          grid.appendChild(h("i.wb-yp-dot", { class: i < daysPassed ? "is-past" : "" }));
        }
        box.appendChild(grid);
      } else {
        box.appendChild(h("div.wb-bar", null, h("div.wb-bar-fill", { style: { width: `${pct.toFixed(2)}%` } })));
      }

      box.appendChild(h("div.wb-yp-foot", { text: `已过 ${daysPassed} 天 · 还剩 ${days - daysPassed} 天` }));
      el.appendChild(box);
    },
  };
}
