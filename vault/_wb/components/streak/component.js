/* 组件 · streak 连续记录
 * 连续写了多少天。刻意把「今天还没写」算作连续未中断 —— 一天还没过完，
 * 提前宣告断更只会让人泄气。 */
(WB) => {
  const key = (d) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  return {
    meta: {
      id: "streak",
      group: "tasks",
      name: { zh: "连续记录", en: "Streak" },
      desc: { zh: "连续多少天有产出，以及历史最长纪录", en: "Current and longest run of consecutive active days" },
      props: {
        source: { type: "path", default: "",      desc: "统计范围，留空为全库，支持 @别名" },
        field:  { type: "enum", default: "ctime", options: ["ctime", "mtime"], desc: "按创建还是修改时间" },
        unit:   { type: "text", default: "天",    desc: "单位文字" },
        label:  { type: "text", default: "",      desc: "分区标题" },
      },
      layout: { w: 8, h: 8 },
      demo: { label: "连续记录" },
    },

    async render({ el, dv, props, h, q, ui }) {
      const field = props.field === "mtime" ? "mtime" : "ctime";
      const active = new Set(Object.keys(q.tallyByDay(q.pages(dv, props.source), field)));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 当前连续：今天没写不算断（一天还没过完），从昨天接着往回数
      let current = 0;
      let cursor = new Date(today);
      if (!active.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (active.has(key(cursor))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      }

      // 历史最长：把所有活跃日排序后找最长的连续段
      const days = [...active].sort();
      let longest = 0, run = 0, prev = null;
      for (const s of days) {
        const d = new Date(s + "T00:00:00");
        run = prev && (d - prev) === 86400000 ? run + 1 : 1;
        longest = Math.max(longest, run);
        prev = d;
      }

      const box = h("div.wb-streak");
      const head = ui.head(props.label);
      if (head) box.appendChild(head);

      box.appendChild(
        h("div.wb-streak-body", null,
          h("div.wb-streak-main", null,
            h("span.wb-streak-num.wb-num", { text: String(current) }),
            h("span.wb-streak-unit", { text: props.unit || "天" })
          ),
          h("div.wb-streak-meta", { text: `最长 ${longest} ${props.unit || "天"} · 累计 ${active.size} 天有产出` })
        )
      );
      el.appendChild(box);
    },
  };
}
