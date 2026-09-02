/* 组件 · coverage 字段体检
 * 某个 frontmatter 字段在某个范围里的填写率，外加几条没填的。
 * 「摘要覆盖率 76%」这种指标只有摆在首页才会真的去补 —— 藏在某个
 * 检查脚本的输出里，就永远不会有人看。 */
(WB) => ({
  meta: {
    id: "coverage",
    group: "metrics",
    name: { zh: "字段体检", en: "Field Coverage" },
    desc: {
      zh: "某个 frontmatter 字段的填写率，并列出还没填的笔记",
      en: "How many notes have a given frontmatter field — and which don't",
    },
    props: {
      source:   { type: "path",   default: "",  desc: "范围，支持 @别名" },
      field:    { type: "text",   default: "",  desc: "要检查的字段名，多个候选用逗号分隔（有其一即算已填）" },
      showMiss: { type: "number", default: 5,   desc: "列出几条没填的（0 = 不列）" },
      label:    { type: "text",   default: "",  desc: "分区标题，留空用字段名" },
    },
    layout: { w: 10, h: 12 },
    demo: { field: "一句话描述", showMiss: 4 },
  },

  async render({ el, dv, props, h, q, ui, empty }) {
    const names = String(props.field || "").split(",").map((s) => s.trim()).filter(Boolean);
    const box = h("div.wb-cov");

    if (!names.length) {
      box.appendChild(empty("还没指定字段", '点⚙填 field，例如「一句话描述」或「summary,摘要」'));
      el.appendChild(box);
      return;
    }

    const pages = q.pages(dv, props.source);
    const missing = pages.filter((p) => q.field(p, ...names) == null);
    const filled = pages.length - missing.length;
    const pct = pages.length ? Math.round((filled / pages.length) * 100) : 0;

    const headEl = ui.head(props.label || names[0], `${filled} / ${pages.length}`);
    if (headEl) box.appendChild(headEl);

    if (!pages.length) {
      box.appendChild(empty("这个范围里没有笔记", props.source ? `范围：${props.source}` : ""));
      el.appendChild(box);
      return;
    }

    box.appendChild(h("div.wb-cov-num.wb-num", { text: `${pct}%` }));
    box.appendChild(h("div.wb-bar", null, h("div.wb-bar-fill", { style: { width: `${pct}%` } })));
    box.appendChild(h("div.wb-bar-label", {
      text: missing.length ? `还有 ${missing.length} 篇没填` : "全部填好了",
    }));

    const n = Math.max(0, Math.min(20, Number(props.showMiss) || 0));
    if (n && missing.length) {
      // 缺得最久的先补：按修改时间倒序，最近动过的更可能还记得内容
      const rows = missing
        .sort((a, b) => (q.timeOf(b, "mtime")?.getTime() ?? 0) - (q.timeOf(a, "mtime")?.getTime() ?? 0)
          || a.file.path.localeCompare(b.file.path))
        .slice(0, n);
      box.appendChild(h("div.wb-cov-list", null,
        ui.noteList(rows.map((p) => ({ path: p.file.path, name: p.file.name })), { dense: true, bullet: "·" })
      ));
    }

    el.appendChild(box);
  },
})
