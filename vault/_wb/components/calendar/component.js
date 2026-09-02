/* 组件 · calendar 月历
 * 一个月的格子，有日记的日期点亮并可点开。和 daily 的区别：daily 管
 * 「今天写没写」，calendar 给的是整月的全貌。 */
(WB) => {
  const WEEK_ZH = ["一", "二", "三", "四", "五", "六", "日"];
  const WEEK_EN = ["M", "T", "W", "T", "F", "S", "S"];

  return {
    meta: {
      id: "calendar",
      group: "tasks",
      name: { zh: "月历", en: "Calendar" },
      desc: { zh: "整月日历，写过日记的日期点亮可点开", en: "A month grid; days with a note are lit and clickable" },
      props: {
        folder:   { type: "path", default: "@daily",     desc: "日记所在文件夹" },
        format:   { type: "text", default: "YYYY-MM-DD", desc: "文件名日期格式" },
        showCount:{ type: "bool", default: true,         desc: "标题右侧显示本月已写篇数" },
        label:    { type: "text", default: "",           desc: "分区标题，留空显示「YYYY年M月」" },
      },
      layout: { w: 8, h: 16 },
      demo: {},
    },

    async render({ el, app, props, h, ui, i18n, cfg }) {
      const folder = cfg.path(props.folder) || "";
      const pathFor = (d) => `${folder ? folder + "/" : ""}${i18n.formatPattern(d, props.format)}.md`;
      const exists = (p) => !!app.vault.getAbstractFileByPath(p);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const year = today.getFullYear();
      const month = today.getMonth();

      const first = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      // 周一为一周之首：把 JS 的 0=周日 换算成 0=周一
      const lead = (first.getDay() + 6) % 7;

      const box = h("div.wb-cal");
      let written = 0;
      for (let d = 1; d <= daysInMonth; d++) if (exists(pathFor(new Date(year, month, d)))) written++;

      box.appendChild(
        ui.head(props.label || `${year} 年 ${month + 1} 月`, props.showCount ? `${written} / ${daysInMonth}` : null)
      );

      const grid = h("div.wb-cal-grid");
      const names = i18n.locale() === "en" ? WEEK_EN : WEEK_ZH;
      for (const w of names) grid.appendChild(h("div.wb-cal-dow", { text: w }));
      for (let i = 0; i < lead; i++) grid.appendChild(h("div.wb-cal-pad"));

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const p = pathFor(date);
        const has = exists(p);
        const isToday = d === today.getDate();
        const cell = h("div.wb-cal-day", {
          class: `${has ? "is-done" : ""}${isToday ? " is-today" : ""}`,
          text: String(d),
          title: has ? `${i18n.formatPattern(date, props.format)} · 已写` : i18n.formatPattern(date, props.format),
        });
        if (has) cell.addEventListener("click", () => app.workspace.openLinkText(p, "", false));
        grid.appendChild(cell);
      }

      box.appendChild(grid);
      el.appendChild(box);
    },
  };
}
