/* 组件 · bookmarks 收藏
 * 默认直接读 Obsidian 自带的「书签」核心插件 —— 用户已经收藏过的东西
 * 零配置就出现在首页，不用再手抄一遍链接。读不到再退回手写列表。 */
(WB) => {
  function nativeBookmarks(app, group) {
    const plugin = app.internalPlugins?.getPluginById?.("bookmarks");
    const inst = plugin && plugin.instance;
    if (!inst || typeof inst.getBookmarks !== "function") return null;

    const flat = [];
    const walk = (items, path) => {
      for (const it of items || []) {
        if (it.type === "group") {
          walk(it.items, [...path, it.title || ""]);
        } else {
          flat.push({ item: it, group: path.join(" / ") });
        }
      }
    };
    walk(inst.getBookmarks(), []);

    const wanted = String(group || "").trim();
    return flat
      .filter((r) => !wanted || r.group === wanted || r.group.startsWith(wanted + " / "))
      .map(({ item, group: g }) => ({
        label: item.title || (item.path ? item.path.split("/").pop().replace(/\.md$/, "") : item.query || "书签"),
        note: item.type === "file" || item.type === "folder" ? item.path : null,
        kind: item.type,
        group: g,
      }));
  }

  return {
    meta: {
      id: "bookmarks",
      group: "nav",
      name: { zh: "收藏", en: "Bookmarks" },
      desc: {
        zh: "读取 Obsidian 自带书签，或手写一组常用入口",
        en: "Reads Obsidian's native bookmarks, or a hand-written list of links",
      },
      props: {
        mode:    { type: "enum",   default: "native", options: ["native", "manual"], desc: "native 读 Obsidian 书签，manual 用下面的 items" },
        group:   { type: "text",   default: "",       desc: "只显示某个书签分组（native 模式）" },
        items:   { type: "array",  default: [],       desc: "手写列表 [{ label, note, icon }]（manual 模式）" },
        limit:   { type: "number", default: 12,       desc: "最多显示几条" },
        columns: { type: "number", default: 2,        desc: "分几列" },
        label:   { type: "text",   default: "",       desc: "分区标题" },
      },
      layout: { w: 10, h: 12 },
      demo: {
        mode: "manual",
        label: "常用",
        items: [
          { label: "写作计划", icon: "📝", note: "计划" },
          { label: "读书笔记", icon: "📚", note: "读书" },
          { label: "项目看板", icon: "📊", note: "项目" },
          { label: "灵感箱", icon: "💡", note: "灵感" },
        ],
      },
    },

    async render({ el, app, props, h, link, empty, cfg }) {
      let rows = [];
      let fellBack = false;

      if (props.mode !== "manual") {
        const native = nativeBookmarks(app, props.group);
        if (native && native.length) rows = native;
        else fellBack = true;
      }
      if (!rows.length) {
        rows = (Array.isArray(props.items) ? props.items : []).map((it) => ({
          label: it.label || it.note || "",
          note: it.note ? cfg.path(it.note) : null,
          icon: it.icon,
          kind: "file",
        }));
      }

      const box = h("div.wb-bm");
      if (props.label) {
        box.appendChild(h("div.wb-head", null, h("span.wb-head-label", { text: props.label })));
      }

      if (!rows.length) {
        box.appendChild(
          empty(
            fellBack ? "还没有添加任何书签" : "还没有配置收藏",
            fellBack ? "在 Obsidian 里右键笔记 →「添加到书签」就会出现在这里" : "把 mode 改成 manual 并填写 items"
          )
        );
        el.appendChild(box);
        return;
      }

      const limit = Math.max(1, Math.min(60, Number(props.limit) || 12));
      const grid = h("div.wb-bm-grid", {
        style: { "--wb-bm-cols": String(Math.max(1, Math.min(4, Number(props.columns) || 2))) },
      });

      for (const r of rows.slice(0, limit)) {
        const inner = h("span.wb-bm-text", null,
          r.icon ? h("span.wb-bm-icon", { text: r.icon }) : null,
          h("span.wb-bm-label", { text: r.label })
        );

        let node;
        if (r.note) {
          node = link(r.note, "");
          node.classList.add("wb-bm-item");
          node.appendChild(inner);
        } else {
          // 搜索/图谱这类书签没有可打开的路径，展示但不做成链接
          node = h("span.wb-bm-item.is-plain", null, inner);
        }
        grid.appendChild(node);
      }

      box.appendChild(grid);
      el.appendChild(box);
    },
  };
}
