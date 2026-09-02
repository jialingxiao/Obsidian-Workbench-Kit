/* 组件 · text 文本块
 * 直接在看板上写一段话。不做 markdown 渲染（那是 embed 的活），
 * 只保证换行和基本排版，用来放说明、提醒、待办清单标题这类东西。 */
(WB) => ({
  meta: {
    id: "text",
    group: "layout",
    name: { zh: "文本块", en: "Text" },
    desc: { zh: "在看板上直接写一段自由文字", en: "A free-text block you type right into the board" },
    props: {
      content: { type: "text", default: "", desc: "正文，用 \\n 换行" },
      title:   { type: "text", default: "", desc: "小标题" },
      size:    { type: "enum", default: "md", options: ["sm", "md", "lg"], desc: "字号" },
      align:   { type: "enum", default: "left", options: ["left", "center"], desc: "对齐方式" },
      boxed:   { type: "bool", default: false, desc: "加个边框底色，变成便签的样子" },
    },
    layout: { w: 8, h: 8 },
    demo: { title: "提醒", content: "每周日晚上回顾一次本周笔记。\\n把值得展开的挑出来。" },
  },

  async render({ el, props, h, empty }) {
    if (!props.content && !props.title) {
      el.appendChild(empty("还没有内容", "点⚙填 content"));
      return;
    }

    const box = h("div.wb-text", {
      class: `is-${props.size || "md"} is-${props.align || "left"}${props.boxed ? " is-boxed" : ""}`,
    });

    if (props.title) box.appendChild(h("div.wb-text-title", { text: props.title }));

    const body = h("div.wb-text-body");
    String(props.content || "")
      .split(/\\n|\n/)
      .forEach((line, i) => {
        if (i) body.appendChild(h("br"));
        body.appendChild(document.createTextNode(line));
      });
    box.appendChild(body);

    el.appendChild(box);
  },
})
