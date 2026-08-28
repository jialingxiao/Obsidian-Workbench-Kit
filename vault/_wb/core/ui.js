/* core/ui.js · 组件分组 + 共用渲染片段
 *
 * 组件多起来之后，「笔记列表」「横向条形图」「小方块格子」这几种版式
 * 会被反复用到。抽在这里，组件文件就只剩「取什么数据」这一件事，
 * 也保证同一种版式在所有组件里长得一模一样。 */
(WB) => {
  const { h } = WB.dom;

  /* 组件分类。顺序即「＋ 组件」面板里的显示顺序，从「先看到什么」
   * 到「细节补充」排列。 */
  const GROUPS = [
    { id: "header",  name: { zh: "页头",      en: "Header" } },
    { id: "nav",     name: { zh: "导航入口",  en: "Navigation" } },
    { id: "metrics", name: { zh: "数据统计",  en: "Metrics" } },
    { id: "notes",   name: { zh: "笔记流",    en: "Notes" } },
    { id: "tasks",   name: { zh: "任务与计划", en: "Tasks & Planning" } },
    { id: "layout",  name: { zh: "版面元素",  en: "Layout" } },
    { id: "decor",   name: { zh: "装饰",      en: "Decorative" } },
  ];

  const groupName = (id) => {
    const g = GROUPS.find((x) => x.id === id);
    return g ? WB.i18n.pick(g.name) : WB.i18n.pick({ zh: "其他", en: "Other" });
  };

  /* 分区标题：左边小标签，右边计数/说明 */
  function head(label, meta) {
    if (!label && !meta) return null;
    return h("div.wb-head", null,
      h("span.wb-head-label", { text: label || "" }),
      meta != null ? h("span.wb-head-meta", { text: String(meta) }) : null
    );
  }

  /* 统一的笔记列表。items: [{ path, name, desc, meta, sub }] */
  function noteList(items, opts) {
    const o = opts || {};
    const ul = h("ul.wb-list", { class: o.dense ? "is-dense" : "" });
    for (const it of items) {
      const main = h("div.wb-list-main", null,
        it.path ? WB.dom.link(it.path, it.name) : h("span.wb-list-name", { text: it.name }),
        it.desc ? h("div.wb-list-desc", { text: String(it.desc) }) : null,
        it.sub ? h("div.wb-list-sub", { text: String(it.sub) }) : null
      );
      ul.appendChild(
        h("li.wb-list-item", null,
          o.bullet ? h("span.wb-list-bullet", { text: o.bullet }) : null,
          main,
          it.meta != null ? h("div.wb-list-meta", { text: String(it.meta) }) : null
        )
      );
    }
    return ul;
  }

  /* 统一的横向条形图。rows: [{ label, n, value }] */
  function bars(rows, opts) {
    const o = opts || {};
    const max = Math.max(1, ...rows.map((r) => r.n));
    const box = h("div.wb-bars");
    for (const r of rows) {
      const node = h("div.wb-bars-row", null,
        h("div.wb-bars-name", { text: r.label, title: r.label }),
        h("div.wb-bars-track", null,
          h("div.wb-bars-fill", { style: { width: `${(r.n / max) * 100}%` } })
        ),
        h("div.wb-bars-val.wb-num", { text: r.value != null ? String(r.value) : String(r.n) })
      );
      if (r.path) {
        node.classList.add("is-linked");
        node.addEventListener("click", () => WB.app.workspace.openLinkText(r.path, "", false));
      }
      box.appendChild(node);
    }
    return box;
  }

  /* 竖向柱状图（趋势用）。rows: [{ label, n }] */
  function columns(rows, opts) {
    const o = opts || {};
    const max = Math.max(1, ...rows.map((r) => r.n));
    const box = h("div.wb-cols", { style: { "--wb-cols-n": String(rows.length) } });
    for (const r of rows) {
      box.appendChild(
        h("div.wb-cols-item", { title: `${r.label}: ${r.n}` },
          o.showValue ? h("div.wb-cols-val.wb-num", { text: r.n ? String(r.n) : "" }) : null,
          h("div.wb-cols-bar", { style: { height: `${Math.max(2, (r.n / max) * 100)}%` } }),
          h("div.wb-cols-label", { text: r.label })
        )
      );
    }
    return box;
  }

  /* 标签/胶囊组。items: [{ label, n, onClick }] */
  function chips(items) {
    const box = h("div.wb-chips");
    for (const it of items) {
      const el = h("span.wb-chip", null,
        h("span.wb-chip-label", { text: it.label }),
        it.n != null ? h("span.wb-chip-n.wb-num", { text: String(it.n) }) : null
      );
      if (it.onClick) {
        el.classList.add("is-clickable");
        el.addEventListener("click", it.onClick);
      }
      box.appendChild(el);
    }
    return box;
  }

  /* 取一篇笔记的摘要：先按指定字段找，找不到就退回正文首句。
   * descField 支持逗号分隔多个候选名（中英混用的库很常见）。 */
  function descOf(page, descField) {
    const names = String(descField || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    if (!names.length) return null;
    const v = WB.query.field(page, ...names);
    return v == null ? null : String(v);
  }

  /* 某一天的周期笔记路径。日记入口、月历、本周、习惯打卡都要算这个，
   * 抽出来免得四份实现各自漂移。 */
  function dailyPath(folder, format, d) {
    const base = WB.config.path(folder || "") || "";
    return `${base ? base + "/" : ""}${WB.i18n.formatPattern(d, format)}.md`;
  }

  /* 只按年月日构造，不掺时区偏移 —— 直接加减毫秒会在夏令时那天漂一小时 */
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  return { GROUPS, groupName, head, noteList, bars, columns, chips, descOf, dailyPath, addDays, today };
}
