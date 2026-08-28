/* 组件 · stats 指标卡组
 * 一排大数字 + 可选的进度条。每个指标的值可以直接写死，也可以
 * 由一个路径（支持 @别名）自动统计笔记数。 */
(WB) => {
  function valueOf(dv, q, item) {
    if (item.value != null) return item.value;
    if (item.source != null) return q.count(dv, item.source);
    return 0;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  return {
    meta: {
      id: "stats",
      group: "metrics",
      name: { zh: "指标卡组", en: "Stat Tiles" },
      desc: {
        zh: "一排关键数字，值可写死或按路径自动统计；可附一条进度条",
        en: "A row of key numbers, literal or auto-counted from a path, with an optional progress bar",
      },
      props: {
        items: {
          type: "array",
          default: [],
          desc: "指标数组，每项 { label, sub, source, value, link }。source 为路径时自动统计笔记数",
        },
        columns: { type: "number", default: 0, desc: "每行几列，0 表示按项目数自适应" },
        progress: {
          type: "object",
          default: null,
          desc: "进度条 { label, value, max } 或 { label, source, maxSource }",
        },
        label: { type: "text", default: "", desc: "分区标题，留空则不显示" },
      },
      layout: { w: 7, h: 5 },
      demo: {
        label: "By the Numbers",
        items: [
          { label: "Inbox", sub: "待消化", value: 42 },
          { label: "Notes", sub: "笔记", value: 318 },
          { label: "Concepts", sub: "概念", value: 76 },
          { label: "Output", sub: "产出", value: 12 },
        ],
        progress: { label: "整理进度", value: 76, max: 318 },
      },
    },

    async render({ el, dv, props, h, q, t, empty }) {
      const items = Array.isArray(props.items) ? props.items : [];
      if (!items.length) {
        el.appendChild(empty(t("stats.empty"), '在参数里写 items: [{ label: "笔记", source: "@notes" }]'));
        return;
      }

      const box = h("div.wb-stats");

      if (props.label) {
        box.appendChild(h("div.wb-head", null, h("span.wb-head-label", { text: props.label })));
      }

      const cols = props.columns > 0 ? props.columns : Math.min(items.length, 4);
      const grid = h("div.wb-stats-grid", {
        style: { "--wb-stats-cols": String(cols) },
      });

      for (const item of items) {
        const value = valueOf(dv, q, item);
        const tile = h(
          "div.wb-stat",
          null,
          h("div.wb-stat-num.wb-num", { text: String(value) }),
          h("div.wb-stat-label", { text: item.label ?? "" }),
          item.sub ? h("div.wb-stat-sub", { text: item.sub }) : null
        );

        if (item.link) {
          const a = WB.dom.link(item.link, "");
          a.className = "wb-stat-hit";
          tile.classList.add("is-linked");
          tile.appendChild(a);
        }
        grid.appendChild(tile);
      }
      box.appendChild(grid);

      // ── 进度条 ──
      const p = props.progress;
      if (p) {
        const value = p.value != null ? p.value : p.source != null ? q.count(dv, p.source) : 0;
        const max = p.max != null ? p.max : p.maxSource != null ? q.count(dv, p.maxSource) : 100;
        const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;

        box.appendChild(
          h(
            "div.wb-stat-progress",
            null,
            h("div.wb-bar", null, h("div.wb-bar-fill", { style: { width: `${pct.toFixed(1)}%` } })),
            h("div.wb-bar-label", {
              text: `${p.label ? p.label + " " : ""}${Math.round(pct)}% · ${value} / ${max}`,
            })
          )
        );
      }

      el.appendChild(box);
    },
  };
}
