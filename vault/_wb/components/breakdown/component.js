/* 组件 · breakdown 分类占比
 * 一组横向条形图，看清笔记都堆在哪。不填 items 时自动按 source 下的
 * 子文件夹拆分 —— 零配置就有东西看。 */
(WB) => ({
  meta: {
    id: "breakdown",
    group: "metrics",
    name: { zh: "分类占比", en: "Breakdown" },
    desc: {
      zh: "按文件夹或自定义范围统计笔记数，画成横向条形图",
      en: "Horizontal bars of note counts per folder or custom source",
    },
    props: {
      source:      { type: "path",   default: "",    desc: "自动模式的根目录，按其子文件夹拆分" },
      items:       { type: "array",  default: [],    desc: "手动指定 [{ label, source }]，填了就不走自动模式" },
      limit:       { type: "number", default: 8,     desc: "最多显示几项" },
      sort:        { type: "bool",   default: true,  desc: "按数量从多到少排序" },
      showPercent: { type: "bool",   default: false, desc: "显示百分比而不是绝对数量" },
      label:       { type: "text",   default: "",    desc: "分区标题" },
    },
    layout: { w: 10, h: 12 },
    demo: { label: "分类", source: "", items: [], limit: 6 },
  },

  async render({ el, dv, app, props, h, q, ui, empty, cfg }) {
    let rows = [];

    const manual = Array.isArray(props.items) ? props.items : [];
    if (manual.length) {
      rows = manual.map((it) => ({ label: it.label || it.source, n: q.count(dv, it.source) }));
    } else {
      const base = cfg.path(props.source || "") || "";
      for (const sub of q.subfolders(app, props.source || "")) {
        rows.push({ label: sub, n: q.count(dv, `${base ? base + "/" : ""}${sub}`) });
      }
    }

    rows = rows.filter((r) => r.n > 0);
    if (props.sort) rows.sort((a, b) => b.n - a.n);
    rows = rows.slice(0, Math.max(1, Math.min(30, Number(props.limit) || 8)));

    const box = h("div.wb-bd");
    const total = rows.reduce((s, r) => s + r.n, 0);

    if (props.label) {
      box.appendChild(
        h("div.wb-head", null,
          h("span.wb-head-label", { text: props.label }),
          h("span.wb-head-meta", { text: `共 ${total}` })
        )
      );
    }

    if (!rows.length) {
      box.appendChild(empty("没有可统计的分类", "填 source 指向一个有子文件夹的目录，或手动配置 items"));
      el.appendChild(box);
      return;
    }

    /* 用共用的 ui.bars() 而不是自己画一套 —— 早先这里有一份重复实现，
       结果给条形图加双色渐变时它没吃到，成了唯一一个还是单色的图表。
       同类版式只留一份，就不会有这种漏网。 */
    box.appendChild(ui.bars(rows.map((r) => ({
      label: r.label,
      n: r.n,
      value: props.showPercent && total > 0 ? `${Math.round((r.n / total) * 100)}%` : String(r.n),
    }))));

    el.appendChild(box);
  },
})
