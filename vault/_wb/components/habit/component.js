/* 组件 · habit 习惯打卡
 * 习惯 × 日期的网格。数据不另存一份 —— 直接读日记里的 checkbox：
 * 某天的日记里有一条已完成的待办、文本包含习惯名，那天就算打卡。
 *
 * 这样做的好处是打卡这件事仍然发生在日记里（顺手就勾了），首页只负责
 * 把它汇总出来，不需要用户维护第二份数据。 */
(WB) => ({
  meta: {
    id: "habit",
    group: "tasks",
    name: { zh: "习惯打卡", en: "Habit Tracker" },
    desc: {
      zh: "习惯 × 日期网格，数据来自日记里已勾选的待办，不用另记一份",
      en: "A habit × day grid driven by completed checkboxes in your daily notes",
    },
    props: {
      habits: { type: "array",  default: [], desc: '习惯名数组，如 ["晨跑","读书","冥想"]。会去日记的待办文本里做包含匹配' },
      folder: { type: "path",   default: "@daily",     desc: "日记所在文件夹" },
      format: { type: "text",   default: "YYYY-MM-DD", desc: "文件名日期格式" },
      days:   { type: "number", default: 21,           desc: "回看多少天" },
      showRate: { type: "bool", default: true,         desc: "右侧显示完成率" },
      label:  { type: "text",   default: "",           desc: "分区标题" },
    },
    layout: { w: 12, h: 12 },
    demo: {
      label: "习惯",
      habits: ["晨跑", "读书", "冥想"],
      days: 14,
    },
  },

  async render({ el, dv, props, h, q, ui, i18n, empty }) {
    const habits = (Array.isArray(props.habits) ? props.habits : []).map(String).filter(Boolean);
    const box = h("div.wb-hb");
    const headEl = ui.head(props.label);
    if (headEl) box.appendChild(headEl);

    if (!habits.length) {
      box.appendChild(empty(
        "还没有设定习惯",
        '点⚙填 habits，例如 ["晨跑","读书"]；然后在日记里写 - [ ] 晨跑'
      ));
      el.appendChild(box);
      return;
    }

    const days = Math.max(7, Math.min(90, Number(props.days) || 21));
    const today = ui.today();

    /* 日记路径 → 那天已完成的待办文本。反过来按路径查，比按天读文件快得多 */
    const donePerPath = new Map();
    for (const t of q.tasks(dv, props.folder, { showDone: true, onlyDone: true })) {
      if (!donePerPath.has(t.path)) donePerPath.set(t.path, []);
      donePerPath.get(t.path).push(String(t.text));
    }

    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = ui.addDays(today, -i);
      dates.push({ d, texts: donePerPath.get(ui.dailyPath(props.folder, props.format, d)) || [] });
    }

    const grid = h("div.wb-hb-grid", { style: { "--wb-hb-days": String(days) } });
    for (const name of habits) {
      grid.appendChild(h("div.wb-hb-name", { text: name, title: name }));
      const track = h("div.wb-hb-track");
      let hit = 0;
      for (const day of dates) {
        const done = day.texts.some((t) => t.includes(name));
        if (done) hit++;
        track.appendChild(h("div.wb-hb-cell", {
          class: done ? "is-done" : "is-miss",
          title: `${i18n.formatPattern(day.d, "YYYY-MM-DD")}${done ? " · 已打卡" : ""}`,
        }));
      }
      grid.appendChild(track);
      grid.appendChild(
        props.showRate
          ? h("div.wb-hb-rate.wb-num", { text: `${Math.round((hit / days) * 100)}%` })
          : h("div.wb-hb-rate")
      );
    }

    box.appendChild(grid);
    box.appendChild(h("div.wb-hb-foot", { text: `最近 ${days} 天 · 在日记里写「- [ ] 习惯名」并勾选即可计入` }));
    el.appendChild(box);
  },
})
