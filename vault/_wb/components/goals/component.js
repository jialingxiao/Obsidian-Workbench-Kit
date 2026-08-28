/* 组件 · goals 目标进度
 * 一组「已完成 / 目标」的进度条。当前值可以写死，也可以让它自己去数
 * 某个文件夹里的笔记 —— 写作目标、读书目标这类最常用。 */
(WB) => ({
  meta: {
    id: "goals",
    group: "metrics",
    name: { zh: "目标进度", en: "Goals" },
    desc: { zh: "一组带目标值的进度条，当前值可按路径自动统计", en: "Progress bars against targets, auto-counted from a path" },
    props: {
      items: {
        type: "array",
        default: [],
        desc: '目标数组 [{ label, target, source }] 或 [{ label, target, value }]。source 会自动数该路径下的笔记数',
      },
      showPercent: { type: "bool", default: true, desc: "显示百分比" },
      label:       { type: "text", default: "",   desc: "分区标题" },
    },
    layout: { w: 5, h: 6 },
    demo: {
      label: "今年目标",
      items: [
        { label: "写 100 篇笔记", target: 100, value: 68 },
        { label: "读 24 本书", target: 24, value: 15 },
        { label: "发表 12 篇", target: 12, value: 4 },
      ],
    },
  },

  async render({ el, dv, props, h, q, ui, empty }) {
    const items = Array.isArray(props.items) ? props.items : [];
    const box = h("div.wb-goals");
    const head = ui.head(props.label);
    if (head) box.appendChild(head);

    if (!items.length) {
      box.appendChild(empty("还没有设定目标", '点⚙填 items，例如 [{ label: "写 100 篇", target: 100, source: "@notes" }]'));
      el.appendChild(box);
      return;
    }

    for (const it of items) {
      const value = it.value != null ? Number(it.value) : it.source != null ? q.count(dv, it.source) : 0;
      const target = Math.max(1, Number(it.target) || 1);
      const pct = Math.max(0, Math.min(100, (value / target) * 100));
      const done = value >= target;

      box.appendChild(
        h("div.wb-goal", { class: done ? "is-done" : "" },
          h("div.wb-goal-top", null,
            h("span.wb-goal-label", { text: it.label || "" }),
            h("span.wb-goal-num.wb-num", {
              text: props.showPercent ? `${Math.round(pct)}%　${value}/${target}` : `${value} / ${target}`,
            })
          ),
          h("div.wb-bar", null, h("div.wb-bar-fill", { style: { width: `${pct.toFixed(1)}%` } }))
        )
      );
    }

    el.appendChild(box);
  },
})
