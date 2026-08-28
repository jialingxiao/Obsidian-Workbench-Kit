/* 组件 · reading 在读进度
 * 带进度字段的笔记 + 进度条。读书、追论文、啃长文档都用得上。
 *
 * 进度可以写成三种形式，都认：
 *   进度: 65        （当百分比）
 *   进度: 120/300   （当前/总数）
 *   页码: 120  +  总页数: 300 （两个字段） */
(WB) => {
  function parseProgress(cur, total) {
    if (cur == null) return null;
    const s = String(cur).trim();

    const frac = s.match(/^(\d+(?:\.\d+)?)\s*[/／]\s*(\d+(?:\.\d+)?)$/);
    if (frac) return { value: Number(frac[1]), max: Number(frac[2]) };

    const pct = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (pct) return { value: Number(pct[1]), max: 100 };

    const n = Number(s);
    if (!isFinite(n)) return null;
    const t = total == null ? null : Number(String(total).trim());
    if (t && isFinite(t) && t > 0) return { value: n, max: t };
    return { value: n, max: 100 };   // 没有总数就当百分比
  }

  return {
    meta: {
      id: "reading",
      group: "notes",
      name: { zh: "在读进度", en: "Reading Progress" },
      desc: {
        zh: "带进度字段的笔记加进度条，读书、追论文都用得上",
        en: "Notes with a progress field, shown as progress bars",
      },
      props: {
        source:     { type: "path",   default: "",     desc: "范围，支持 @别名" },
        field:      { type: "text",   default: "进度", desc: "进度字段名，多个候选用逗号分隔。值可写 65、65%、120/300" },
        totalField: { type: "text",   default: "",     desc: "总数字段名（进度里没写分母时用）" },
        limit:      { type: "number", default: 6,      desc: "最多显示几条" },
        hideDone:   { type: "bool",   default: false,  desc: "隐藏已读完的" },
        label:      { type: "text",   default: "",     desc: "分区标题" },
      },
      layout: { w: 5, h: 6 },
      demo: { label: "在读", field: "进度", limit: 4 },
    },

    async render({ el, dv, props, h, q, ui, link, empty }) {
      const names = String(props.field || "进度").split(",").map((s) => s.trim()).filter(Boolean);
      const totals = String(props.totalField || "").split(",").map((s) => s.trim()).filter(Boolean);

      const rows = [];
      for (const p of q.pages(dv, props.source)) {
        const prog = parseProgress(q.field(p, ...names), totals.length ? q.field(p, ...totals) : null);
        if (!prog || !isFinite(prog.value)) continue;
        const pct = prog.max > 0 ? Math.max(0, Math.min(100, (prog.value / prog.max) * 100)) : 0;
        if (props.hideDone && pct >= 100) continue;
        rows.push({ p, ...prog, pct });
      }
      rows.sort((a, b) => b.pct - a.pct || a.p.file.path.localeCompare(b.p.file.path));
      const shown = rows.slice(0, Math.max(1, Math.min(30, Number(props.limit) || 6)));

      const box = h("div.wb-rd");
      const headEl = ui.head(props.label, rows.length ? `${rows.length} 项` : null);
      if (headEl) box.appendChild(headEl);

      if (!shown.length) {
        box.appendChild(empty(
          `没有笔记填写了「${names[0]}」`,
          "在 frontmatter 里写「进度: 120/300」或「进度: 65%」就会出现在这里"
        ));
        el.appendChild(box);
        return;
      }

      for (const r of shown) {
        const done = r.pct >= 100;
        const title = link(r.p.file.path, r.p.file.name);
        title.classList.add("wb-rd-title");
        box.appendChild(h("div.wb-rd-row", { class: done ? "is-done" : "" },
          h("div.wb-rd-top", null, title,
            h("span.wb-rd-num.wb-num", {
              text: r.max === 100 ? `${Math.round(r.pct)}%` : `${r.value} / ${r.max}`,
            })
          ),
          h("div.wb-bar", null, h("div.wb-bar-fill", { style: { width: `${r.pct.toFixed(1)}%` } }))
        ));
      }

      el.appendChild(box);
    },
  };
}
