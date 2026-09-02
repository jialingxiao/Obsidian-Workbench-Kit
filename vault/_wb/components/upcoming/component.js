/* 组件 · upcoming 即将到期
 * 把带日期的待办按时间排好，逾期的标红。Tasks 插件的 📅 语法和
 * Dataview 的 due:: 字段都认。 */
(WB) => {
  /* 从任务文本里抠日期：📅 2026-08-30 / [due:: 2026-08-30] / (due: …) */
  function dueOf(task) {
    if (task.due) {
      const d = task.due.toJSDate ? task.due.toJSDate() : new Date(task.due);
      if (!isNaN(d)) return d;
    }
    const m = String(task.text || "").match(/(?:📅|due::?\s*|@due\s*)\s*(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const d = new Date(m[1] + "T00:00:00");
      if (!isNaN(d)) return d;
    }
    return null;
  }

  const clean = (s) =>
    String(s || "")
      .replace(/(?:📅|⏳|🛫|✅|➕)\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/\[[a-z]+::[^\]]*\]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  return {
    meta: {
      id: "upcoming",
      group: "tasks",
      name: { zh: "即将到期", en: "Upcoming" },
      desc: { zh: "带日期的待办按时间排序，逾期的标红", en: "Dated tasks sorted by due date, overdue ones flagged" },
      props: {
        source:     { type: "path",   default: "",  desc: "范围，支持 @别名" },
        days:       { type: "number", default: 14,  desc: "往后看几天" },
        showOverdue:{ type: "bool",   default: true, desc: "包含已逾期的" },
        limit:      { type: "number", default: 10,  desc: "最多显示几条" },
        label:      { type: "text",   default: "",  desc: "分区标题" },
      },
      layout: { w: 10, h: 14 },
      demo: { label: "即将到期", days: 14 },
    },

    async render({ el, dv, props, h, q, ui, i18n, empty }) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (Number(props.days) || 14));

      const rows = [];
      for (const t of q.tasks(dv, props.source, { showDone: false })) {
        const due = dueOf(t);
        if (!due) continue;
        const overdue = due < today;
        if (overdue && !props.showOverdue) continue;
        if (!overdue && due > horizon) continue;
        rows.push({ t, due, overdue });
      }
      // 同一天到期的按所在笔记兜底排序，顺序才不会随数据层变化
      rows.sort((a, b) => a.due - b.due || String(a.t.path).localeCompare(String(b.t.path)));
      const shown = rows.slice(0, Math.max(1, Math.min(40, Number(props.limit) || 10)));

      const overdueCount = rows.filter((r) => r.overdue).length;
      const box = h("div.wb-up");
      const head = ui.head(props.label, rows.length ? (overdueCount ? `${overdueCount} 项逾期` : `${rows.length} 项`) : null);
      if (head) box.appendChild(head);

      if (!shown.length) {
        box.appendChild(empty("没有临近的待办", "在任务后面加 📅 2026-08-30 就会出现在这里"));
        el.appendChild(box);
        return;
      }

      const ul = h("ul.wb-list");
      for (const r of shown) {
        const days = Math.round((r.due - today) / 86400000);
        const when = r.overdue
          ? `逾期 ${Math.abs(days)} 天`
          : days === 0 ? "今天" : days === 1 ? "明天" : `${days} 天后`;

        ul.appendChild(
          h("li.wb-list-item", { class: r.overdue ? "is-overdue" : "" },
            h("div.wb-list-main", null,
              WB.dom.link(r.t.path, clean(r.t.text)),
              h("div.wb-list-sub", { text: String(r.t.path).split("/").pop().replace(/\.md$/, "") })
            ),
            h("div.wb-list-meta.wb-up-when", { text: when })
          )
        );
      }
      box.appendChild(ul);
      el.appendChild(box);
    },
  };
}
