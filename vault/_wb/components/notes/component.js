/* 组件 · notes 笔记列表
 * 库里最万能的一块：自己选范围、排序、过滤。其他几个笔记流组件都是
 * 它的特定预设，需要自定义视角时用这个。 */
(WB) => ({
  meta: {
    id: "notes",
    group: "notes",
    name: { zh: "笔记列表", en: "Note List" },
    desc: { zh: "自定义范围、排序与过滤的通用笔记列表", en: "A general-purpose note list with your own source, sort and filter" },
    props: {
      source:    { type: "path",   default: "",      desc: "范围，支持 @别名、#标签、Dataview 查询串" },
      sort:      { type: "enum",   default: "mtime", options: ["mtime", "ctime", "name", "random"], desc: "排序方式" },
      order:     { type: "enum",   default: "desc",  options: ["desc", "asc"], desc: "升序还是降序" },
      limit:     { type: "number", default: 10,      desc: "最多显示几条" },
      hasField:  { type: "text",   default: "",      desc: "只显示含有该 frontmatter 字段的笔记" },
      descField: { type: "text",   default: "",      desc: "摘要字段名，多个用逗号分隔" },
      showTime:  { type: "bool",   default: true,    desc: "右侧显示相对时间" },
      showPath:  { type: "bool",   default: false,   desc: "显示所在文件夹" },
      bullet:    { type: "text",   default: "",      desc: "每行前缀符号，如 ·" },
      label:     { type: "text",   default: "",      desc: "分区标题" },
    },
    layout: { w: 5, h: 8 },
    demo: { label: "笔记", limit: 7, showPath: true, descField: "一句话描述" },
  },

  async render({ el, dv, props, h, q, ui, i18n, empty }) {
    let pages = q.pages(dv, props.source);

    if (props.hasField) {
      const names = String(props.hasField).split(",").map((s) => s.trim()).filter(Boolean);
      pages = pages.filter((p) => q.field(p, ...names) != null);
    }

    const timeField = props.sort === "ctime" ? "ctime" : "mtime";
    if (props.sort === "name") {
      pages.sort((a, b) => a.file.name.localeCompare(b.file.name));
    } else if (props.sort === "random") {
      pages.sort(() => Math.random() - 0.5);
    } else {
      pages.sort((a, b) => {
        const ta = q.timeOf(a, timeField), tb = q.timeOf(b, timeField);
        return ((tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0))
          || a.file.path.localeCompare(b.file.path);   // 时间相同时按路径兜底
      });
    }
    if (props.order === "asc" && props.sort !== "random") pages.reverse();

    const rows = pages.slice(0, Math.max(1, Math.min(60, Number(props.limit) || 10)));

    const box = h("div.wb-notes");
    const head = ui.head(props.label, rows.length ? `${rows.length} / ${pages.length}` : null);
    if (head) box.appendChild(head);

    if (!rows.length) {
      box.appendChild(empty("没有符合条件的笔记", props.source ? `范围：${props.source}` : "试试放宽过滤条件"));
      el.appendChild(box);
      return;
    }

    box.appendChild(
      ui.noteList(
        rows.map((p) => {
          const t = q.timeOf(p, timeField);
          return {
            path: p.file.path,
            name: p.file.name,
            desc: ui.descOf(p, props.descField),
            sub: props.showPath && p.file.path.includes("/") ? p.file.path.replace(/\/[^/]+$/, "") : null,
            meta: props.showTime && t ? i18n.fromNow(t) : null,
          };
        }),
        { bullet: props.bullet || null }
      )
    );

    el.appendChild(box);
  },
})
