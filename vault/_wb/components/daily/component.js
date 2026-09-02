/* 组件 · daily 日记入口
 * 一个大按钮直达今天的日记（没有就创建），下面一排小格子显示最近几天
 * 写没写。刻意不依赖 Periodic Notes 插件 —— 只按文件名日期格式找。 */
(WB) => {
  return {
    meta: {
      id: "daily",
      group: "tasks",
      name: { zh: "日记入口", en: "Daily Note" },
      desc: {
        zh: "直达今天的日记，并显示最近几天的完成情况",
        en: "Jump to today's daily note and see recent days at a glance",
      },
      props: {
        folder:   { type: "path",   default: "@daily",     desc: "日记所在文件夹" },
        format:   { type: "text",   default: "YYYY-MM-DD", desc: "文件名日期格式，支持 YYYY MM DD" },
        days:     { type: "number", default: 14,           desc: "回顾最近几天" },
        template: { type: "path",   default: "",           desc: "新建时套用的模板文件（可留空）" },
        label:    { type: "text",   default: "",           desc: "分区标题" },
      },
      layout: { w: 8, h: 10 },
      demo: { label: "日记", days: 14 },
    },

    async render({ el, app, props, h, i18n, cfg }) {
      const folder = cfg.path(props.folder) || "";
      const pathFor = (d) => `${folder ? folder + "/" : ""}${i18n.formatPattern(d, props.format)}.md`;
      const exists = (p) => !!app.vault.getAbstractFileByPath(p);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPath = pathFor(today);
      const hasToday = exists(todayPath);

      const box = h("div.wb-daily");
      if (props.label) {
        box.appendChild(h("div.wb-head", null, h("span.wb-head-label", { text: props.label })));
      }

      // ── 今天 ──
      const main = h("button.wb-daily-today", { class: hasToday ? "is-done" : "is-todo", type: "button" },
        h("div.wb-daily-date", { text: i18n.formatPattern(today, props.format) }),
        h("div.wb-daily-week", { text: `${i18n.formatWeekday(today)} · ${hasToday ? "已写" : "还没写"}` })
      );

      main.addEventListener("click", async () => {
        try {
          if (!exists(todayPath)) {
            if (folder && !app.vault.getAbstractFileByPath(folder)) {
              await app.vault.createFolder(folder).catch(() => {});
            }
            let body = "";
            if (props.template) {
              const tf = app.vault.getAbstractFileByPath(cfg.path(props.template));
              if (tf) body = await app.vault.read(tf);
            }
            await app.vault.create(todayPath, body);
          }
          app.workspace.openLinkText(todayPath, "", false);
        } catch (e) {
          console.error("[Workbench] daily", e);
        }
      });
      box.appendChild(main);

      // ── 最近几天 ──
      const n = Math.max(1, Math.min(60, Number(props.days) || 14));
      const strip = h("div.wb-daily-strip");
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const p = pathFor(d);
        const has = exists(p);
        const cell = h("div.wb-daily-cell", {
          class: `${has ? "is-done" : "is-empty"}${i === 0 ? " is-today" : ""}`,
          title: `${i18n.formatPattern(d, props.format)}${has ? " · 已写" : ""}`,
        });
        if (has) cell.addEventListener("click", () => app.workspace.openLinkText(p, "", false));
        strip.appendChild(cell);
      }
      box.appendChild(strip);

      const done = [...strip.children].filter((c) => c.classList.contains("is-done")).length;
      box.appendChild(h("div.wb-daily-meta", { text: `最近 ${n} 天写了 ${done} 篇` }));

      el.appendChild(box);
    },
  };
}
