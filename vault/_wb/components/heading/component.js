/* 组件 · heading 分区标题
 * 纯排版元素。看板一多就需要分区，不然十几个块糊在一起没有层次。 */
(WB) => ({
  meta: {
    id: "heading",
    group: "layout",
    name: { zh: "分区标题", en: "Heading" },
    desc: { zh: "给看板分段用的标题，可带右侧说明", en: "A section heading to give the board structure" },
    props: {
      text:  { type: "text", default: "分区",  desc: "标题文字" },
      note:  { type: "text", default: "",      desc: "右侧小字说明" },
      size:  { type: "enum", default: "md",    options: ["sm", "md", "lg"], desc: "字号" },
      rule:  { type: "enum", default: "under", options: ["under", "none", "over"], desc: "线的位置" },
      align: { type: "enum", default: "left",  options: ["left", "center"], desc: "对齐方式" },
    },
    layout: { w: 24, h: 4 },
    demo: { text: "今天", note: "Today" },
  },

  async render({ el, props, h }) {
    el.appendChild(
      h("div.wb-heading", { class: `is-${props.size || "md"} rule-${props.rule || "under"} is-${props.align || "left"}` },
        h("span.wb-heading-text", { text: props.text || "" }),
        props.note ? h("span.wb-heading-note", { text: props.note }) : null
      )
    );
  },
})
