/* 组件 · divider 分隔线
 * 最小的组件。也可以当留白用（style: space），给密集的看板喘口气。 */
(WB) => ({
  meta: {
    id: "divider",
    group: "layout",
    name: { zh: "分隔线", en: "Divider" },
    desc: { zh: "一条分隔线，或一段纯留白", en: "A rule, or just breathing room" },
    props: {
      style: { type: "enum", default: "line", options: ["line", "double", "dashed", "space"], desc: "line 细线，double 双线，dashed 虚线，space 纯留白" },
      label: { type: "text", default: "",     desc: "线中间的文字（space 模式无效）" },
    },
    layout: { w: 24, h: 4 },
    demo: {},
  },

  async render({ el, props, h }) {
    const style = props.style || "line";
    if (style === "space") {
      el.appendChild(h("div.wb-divider.is-space"));
      return;
    }
    el.appendChild(
      props.label
        ? h("div.wb-divider.has-label", { class: `is-${style}` }, h("span.wb-divider-label", { text: props.label }))
        : h("div.wb-divider", { class: `is-${style}` })
    );
  },
})
