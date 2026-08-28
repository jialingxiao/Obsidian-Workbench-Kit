/* 组件 · tags 标签
 * 标签云 / 标签榜。点一个标签直接跳到全库搜索该标签。 */
(WB) => ({
  meta: {
    id: "tags",
    group: "nav",
    name: { zh: "标签", en: "Tags" },
    desc: { zh: "按使用频次排列的标签，点击搜索该标签", en: "Tags ranked by usage; click to search" },
    props: {
      source: { type: "path",   default: "",     desc: "统计范围，支持 @别名" },
      style:  { type: "enum",   default: "cloud", options: ["cloud", "bars"], desc: "cloud 标签云，bars 带条形的排行" },
      limit:  { type: "number", default: 24,     desc: "最多显示几个" },
      minCount: { type: "number", default: 1,    desc: "至少被用过几次才显示" },
      label:  { type: "text",   default: "",     desc: "分区标题" },
    },
    layout: { w: 5, h: 6 },
    demo: { label: "标签", limit: 18 },
  },

  async render({ el, dv, app, props, h, q, ui, empty }) {
    const tally = new Map();
    for (const p of q.pages(dv, props.source)) {
      const tags = (p.file && p.file.tags) || [];
      const arr = tags.array ? tags.array() : tags;
      for (const raw of arr) {
        const t = String(raw);
        tally.set(t, (tally.get(t) || 0) + 1);
      }
    }

    const minCount = Math.max(1, Number(props.minCount) || 1);
    const rows = [...tally.entries()]
      .filter(([, n]) => n >= minCount)
      .map(([label, n]) => ({ label, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, Math.max(1, Math.min(80, Number(props.limit) || 24)));

    const box = h("div.wb-tags");
    const head = ui.head(props.label, rows.length ? `${tally.size} 个标签` : null);
    if (head) box.appendChild(head);

    if (!rows.length) {
      box.appendChild(empty("还没有标签", "在笔记里写 #标签 或在 frontmatter 里加 tags"));
      el.appendChild(box);
      return;
    }

    // 打开全库搜索并填好查询串，这是 Obsidian 里「按标签浏览」最顺的路径
    const searchTag = (tag) => {
      try {
        const s = app.internalPlugins.getPluginById("global-search");
        s.instance.openGlobalSearch(`tag:${tag}`);
      } catch (e) {
        console.warn("[Workbench] 无法打开搜索", e);
      }
    };

    if (props.style === "bars") {
      box.appendChild(ui.bars(rows));
    } else {
      const max = Math.max(...rows.map((r) => r.n));
      const cloud = h("div.wb-chips.wb-tagcloud");
      for (const r of rows) {
        // 字号随频次在 0.85–1.35em 间线性变化，一眼看出主力标签
        const scale = 0.85 + (r.n / max) * 0.5;
        const chip = h("span.wb-chip.is-clickable", { style: { fontSize: `${scale.toFixed(2)}em` } },
          h("span.wb-chip-label", { text: r.label }),
          h("span.wb-chip-n.wb-num", { text: String(r.n) })
        );
        chip.addEventListener("click", () => searchTag(r.label));
        cloud.appendChild(chip);
      }
      box.appendChild(cloud);
    }

    el.appendChild(box);
  },
})
