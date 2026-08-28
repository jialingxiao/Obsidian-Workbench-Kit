/* 组件 · search 搜索框
 * 首页上直接开搜。回车交给 Obsidian 的全库搜索，不自己实现搜索 ——
 * 它的语法（path: tag: file:）和结果面板本来就更好用。 */
(WB) => ({
  meta: {
    id: "search",
    group: "nav",
    name: { zh: "搜索框", en: "Search" },
    desc: { zh: "在首页直接发起全库搜索，可预置范围", en: "Kick off a vault search right from the homepage" },
    props: {
      placeholder: { type: "text",  default: "搜索库…", desc: "输入框提示文字" },
      scope:       { type: "path",  default: "",       desc: "限定搜索范围（会拼成 path:\"…\"），支持 @别名" },
      presets:     { type: "array", default: [],       desc: "预置查询按钮 [{ label, query }]" },
      label:       { type: "text",  default: "",       desc: "分区标题" },
    },
    layout: { w: 5, h: 3 },
    demo: {
      presets: [
        { label: "待办", query: "task-todo:\"\"" },
        { label: "本周", query: "" },
        { label: "无标签", query: "-tag:*" },
      ],
    },
  },

  async render({ el, app, props, h, ui, cfg }) {
    const openSearch = (query) => {
      try {
        const p = app.internalPlugins.getPluginById("global-search");
        p.instance.openGlobalSearch(query);
      } catch (e) {
        console.warn("[Workbench] 无法打开全库搜索", e);
      }
    };

    const scope = cfg.path(props.scope || "") || "";
    const withScope = (q) => (scope ? `path:"${scope}" ${q}`.trim() : q);

    const box = h("div.wb-search");
    const head = ui.head(props.label);
    if (head) box.appendChild(head);

    const input = h("input.wb-search-input", { type: "text", placeholder: props.placeholder || "搜索库…" });
    input.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      openSearch(withScope(input.value.trim()));
    });

    const btn = h("button.wb-search-go", { type: "button", text: "搜索" });
    btn.addEventListener("click", () => openSearch(withScope(input.value.trim())));

    box.appendChild(h("div.wb-search-row", null, input, btn));

    const presets = Array.isArray(props.presets) ? props.presets : [];
    if (presets.length) {
      box.appendChild(
        ui.chips(presets.map((p) => ({
          label: p.label || p.query,
          onClick: () => openSearch(withScope(p.query || "")),
        })))
      );
    }

    el.appendChild(box);
  },
})
