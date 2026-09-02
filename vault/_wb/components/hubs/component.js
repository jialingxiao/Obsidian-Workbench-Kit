/* 组件 · hubs 枢纽笔记
 * 被链接最多的笔记 —— 库里实际形成的中心节点。和 orphans 正好是
 * 一体两面：一个看边缘，一个看核心。 */
(WB) => ({
  meta: {
    id: "hubs",
    group: "notes",
    name: { zh: "枢纽笔记", en: "Hubs" },
    desc: { zh: "被引用最多的笔记，库里自然形成的中心", en: "Your most-linked-to notes — the hubs of your vault" },
    props: {
      source: { type: "path",   default: "",     desc: "范围，支持 @别名" },
      limit:  { type: "number", default: 8,      desc: "最多显示几条" },
      style:  { type: "enum",   default: "bars", options: ["bars", "list"], desc: "bars 带条形，list 纯列表" },
      label:  { type: "text",   default: "",     desc: "分区标题" },
    },
    layout: { w: 10, h: 14 },
    demo: { label: "枢纽笔记", limit: 7 },
  },

  async render({ el, dv, props, h, q, ui, empty }) {
    const rows = q
      .pages(dv, props.source)
      .map((p) => {
        const inbound = p.file.inlinks;
        const n = inbound ? (inbound.length ?? (inbound.array ? inbound.array().length : 0)) : 0;
        return { label: p.file.name, path: p.file.path, n };
      })
      .filter((r) => r.n > 0)
      // 并列时按名称兜底：只按 n 排的话，谁在前取决于页面遍历顺序，
      // 换个数据层就会得出不同的 Top N，看起来像数据不稳
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
      .slice(0, Math.max(1, Math.min(40, Number(props.limit) || 8)));

    const box = h("div.wb-hubs");
    const head = ui.head(props.label, rows.length ? `Top ${rows.length}` : null);
    if (head) box.appendChild(head);

    if (!rows.length) {
      box.appendChild(empty("还没有被引用的笔记", "多用 [[双链]] 把笔记连起来，枢纽自然会浮现"));
      el.appendChild(box);
      return;
    }

    box.appendChild(
      props.style === "list"
        ? ui.noteList(rows.map((r) => ({ path: r.path, name: r.label, meta: `${r.n} 处引用` })))
        : ui.bars(rows)
    );
    el.appendChild(box);
  },
})
