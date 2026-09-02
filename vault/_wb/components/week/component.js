/* 组件 · week 本周
 * 七天一横排，每天显示：有没有日记、当天有几条待办。
 * 日记入口管「今天」，月历管「整月」，中间这一层原来是空的 —— 本周
 * 恰好是回顾和计划都用得上的粒度。 */
(WB) => {
  const WEEK_ZH = ["日", "一", "二", "三", "四", "五", "六"];
  const WEEK_EN = ["S", "M", "T", "W", "T", "F", "S"];

  return {
    meta: {
      id: "week",
      group: "tasks",
      name: { zh: "本周", en: "This Week" },
      desc: {
        zh: "七天一排，显示每天的日记状态与待办数量，点击直达当天日记",
        en: "A seven-day strip: daily-note status and task count per day",
      },
      props: {
        folder:      { type: "path", default: "@daily",     desc: "日记所在文件夹" },
        format:      { type: "text", default: "YYYY-MM-DD", desc: "文件名日期格式" },
        startMonday: { type: "bool", default: true,         desc: "周一为一周之首（关掉则周日开始）" },
        showTasks:   { type: "bool", default: true,         desc: "显示当天日记里的待办数" },
        offset:      { type: "number", default: 0,          desc: "偏移几周。0 是本周，-1 是上周" },
        label:       { type: "text", default: "",           desc: "分区标题，留空显示日期范围" },
      },
      layout: { w: 24, h: 10 },
      demo: { label: "本周" },
    },

    async render({ el, app, dv, props, h, q, ui, i18n }) {
      const today = ui.today();
      const dow = today.getDay();
      const back = props.startMonday ? (dow === 0 ? 6 : dow - 1) : dow;
      const start = ui.addDays(today, -back + (Number(props.offset) || 0) * 7);

      /* 当天待办：从日记里取。q.tasks 给的 task 带 path，按路径归到那一天。 */
      const byPath = new Map();
      if (props.showTasks) {
        for (const t of q.tasks(dv, props.folder, { showDone: true })) {
          if (!byPath.has(t.path)) byPath.set(t.path, { done: 0, todo: 0 });
          byPath.get(t.path)[t.completed ? "done" : "todo"]++;
        }
      }

      const names = i18n.locale() === "en" ? WEEK_EN : WEEK_ZH;
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = ui.addDays(start, i);
        const path = ui.dailyPath(props.folder, props.format, d);
        days.push({
          d, path,
          exists: !!app.vault.getAbstractFileByPath(path),
          isToday: d.getTime() === today.getTime(),
          tasks: byPath.get(path) || null,
        });
      }

      const box = h("div.wb-wk");
      const range = `${start.getMonth() + 1}/${start.getDate()} – ${days[6].d.getMonth() + 1}/${days[6].d.getDate()}`;
      const written = days.filter((x) => x.exists).length;
      const headEl = ui.head(props.label || range, `${written} / 7 篇日记`);
      if (headEl) box.appendChild(headEl);

      const row = h("div.wb-wk-row");
      for (const day of days) {
        const cell = h("div.wb-wk-day", {
          class: `${day.exists ? "is-done" : "is-empty"}${day.isToday ? " is-today" : ""}`,
          title: day.exists ? `${i18n.formatPattern(day.d, props.format)} · 已写` : i18n.formatPattern(day.d, props.format),
        },
          h("div.wb-wk-dow", { text: names[day.d.getDay()] }),
          h("div.wb-wk-num.wb-num", { text: String(day.d.getDate()) }),
          day.tasks
            ? h("div.wb-wk-task", {
                text: day.tasks.todo ? `${day.tasks.todo} 待办` : day.tasks.done ? "已清空" : "",
                class: day.tasks.todo ? "is-todo" : "is-clear",
              })
            : h("div.wb-wk-task")
        );
        // 没写的日子也可以点：交给日记入口去创建，这里只负责跳转
        cell.addEventListener("click", () => app.workspace.openLinkText(day.path, "", false));
        row.appendChild(cell);
      }

      box.appendChild(row);
      el.appendChild(box);
    },
  };
}
