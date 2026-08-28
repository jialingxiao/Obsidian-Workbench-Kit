/* 组件 · tasks 待办
 * 渲染和勾选回写都交给数据层的 q.renderTasks —— Dataview 版直接借用
 * dv.taskList，插件版自己画并自己回写。组件这边不需要知道区别。 */
(WB) => ({
  meta: {
    id: "tasks",
    group: "tasks",
    name: { zh: "待办", en: "Tasks" },
    desc: {
      zh: "汇总笔记里的待办事项，可直接勾选（会写回原笔记）",
      en: "Collects checkbox tasks from your notes; ticking writes back to the source note",
    },
    props: {
      source:   { type: "path",   default: "",    desc: "范围，留空为全库，支持 @别名" },
      limit:    { type: "number", default: 12,    desc: "最多显示几条" },
      showDone: { type: "bool",   default: false, desc: "是否包含已完成的" },
      groupByFile: { type: "bool", default: true, desc: "按所在笔记分组" },
      label:    { type: "text",   default: "",    desc: "分区标题" },
    },
    layout: { w: 5, h: 8 },
    demo: { label: "待办", limit: 8 },
  },

  async render(ctx) {
    const { el, dv, props, h, q, empty } = ctx;
    const limit = Math.max(1, Math.min(100, Number(props.limit) || 12));
    const all = q.tasks(dv, props.source, { showDone: !!props.showDone });
    const shown = all.slice(0, limit);

    const box = h("div.wb-tasks");
    if (props.label) {
      box.appendChild(
        h("div.wb-head", null,
          h("span.wb-head-label", { text: props.label }),
          h("span.wb-head-meta", { text: all.length > limit ? `${limit} / ${all.length}` : `${all.length}` })
        )
      );
    }

    if (!shown.length) {
      box.appendChild(empty(props.showDone ? "没有任何任务" : "没有未完成的任务", "在笔记里写 - [ ] 就会出现在这里"));
      el.appendChild(box);
      return;
    }

    const host = h("div.wb-tasks-list");
    box.appendChild(host);
    el.appendChild(box);

    await q.renderTasks(ctx, host, shown, { groupByFile: !!props.groupByFile });
  },
})
