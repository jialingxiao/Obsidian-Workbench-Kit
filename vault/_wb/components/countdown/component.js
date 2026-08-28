/* 组件 · countdown 倒计时 / 纪念日
 * 距某天还有多少天，或已经过去多少天。实现成本几乎为零，但几乎每个
 * 首页都想要一个 —— 截稿日、生日、纪念日、项目里程碑。
 *
 * 支持「每年重复」：生日、纪念日这类只写月日就行，过了今年自动跳明年。 */
(WB) => {
  function parseDate(s) {
    const str = String(s || "").trim();
    // 只写月日 → 按今年算，过了就跳明年
    const md = str.match(/^(\d{1,2})[-/月](\d{1,2})日?$/);
    if (md) {
      const now = new Date();
      let d = new Date(now.getFullYear(), Number(md[1]) - 1, Number(md[2]));
      d.setHours(0, 0, 0, 0);
      const t = new Date(); t.setHours(0, 0, 0, 0);
      if (d < t) d = new Date(now.getFullYear() + 1, Number(md[1]) - 1, Number(md[2]));
      return d;
    }
    const m = str.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }

  return {
    meta: {
      id: "countdown",
      group: "tasks",
      name: { zh: "倒计时", en: "Countdown" },
      desc: {
        zh: "距某天还有多少天，或已经过去多少天。只写月日则每年重复",
        en: "Days until (or since) a date; month-day only repeats yearly",
      },
      props: {
        items: {
          type: "array",
          default: [],
          desc: '[{ label, date }]。date 写 2026-12-31 或 12-31（每年重复）。' +
                '加 mode: "since" 则显示「已过去多少天」',
        },
        columns: { type: "number", default: 0, desc: "每行几个，0 表示自适应" },
        label:   { type: "text",   default: "", desc: "分区标题" },
      },
      layout: { w: 5, h: 4 },
      demo: {
        label: "倒计时",
        items: [
          { label: "年底", date: "12-31" },
          { label: "项目交付", date: "2026-11-15" },
        ],
      },
    },

    async render({ el, props, h, ui, empty }) {
      const items = Array.isArray(props.items) ? props.items : [];
      const box = h("div.wb-cd");
      const headEl = ui.head(props.label);
      if (headEl) box.appendChild(headEl);

      if (!items.length) {
        box.appendChild(empty("还没有设定日期", '点⚙填 items，例如 [{ label: "年底", date: "12-31" }]'));
        el.appendChild(box);
        return;
      }

      const today = ui.today();
      const cols = props.columns > 0 ? props.columns : Math.min(items.length, 3);
      const grid = h("div.wb-cd-grid", { style: { "--wb-cd-n": String(cols) } });

      for (const it of items) {
        const d = parseDate(it.date);
        if (!d) {
          grid.appendChild(h("div.wb-cd-item", null,
            h("div.wb-cd-num.wb-num", { text: "?" }),
            h("div.wb-cd-label", { text: it.label || "" }),
            h("div.wb-cd-sub", { text: `日期读不懂：${it.date}` })
          ));
          continue;
        }
        d.setHours(0, 0, 0, 0);
        const days = Math.round((d - today) / 86400000);
        const since = it.mode === "since" || days < 0;
        const n = Math.abs(days);

        grid.appendChild(h("div.wb-cd-item", { class: since ? "is-since" : days <= 7 ? "is-near" : "" },
          h("div.wb-cd-num.wb-num", { text: n === 0 ? "今天" : String(n) }),
          h("div.wb-cd-label", { text: it.label || "" }),
          h("div.wb-cd-sub", {
            text: n === 0 ? "就是今天" : since ? "天前" : "天后",
          })
        ));
      }

      box.appendChild(grid);
      el.appendChild(box);
    },
  };
}
