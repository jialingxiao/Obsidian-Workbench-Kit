/* 组件 · banner 横幅
 * 一张铺满的图，上面压标题。图片走 getResourcePath 解析库内路径，
 * 也支持外链。 */
(WB) => ({
  meta: {
    id: "banner",
    group: "header",
    name: { zh: "横幅", en: "Banner" },
    desc: { zh: "带标题的大图横幅，可用库内图片或网络图片", en: "A cover image with an overlaid title" },
    props: {
      image:    { type: "path", default: "",       desc: "图片路径（库内）或 http 网址" },
      title:    { type: "text", default: "",       desc: "压在图上的标题" },
      subtitle: { type: "text", default: "",       desc: "副标题" },
      link:     { type: "path", default: "",       desc: "点击后打开的笔记（可留空）" },
      align:    { type: "enum", default: "bottom", options: ["top", "center", "bottom"], desc: "文字竖向位置" },
      overlay:  { type: "bool", default: true,     desc: "文字下加暗色渐变，保证可读" },
    },
    layout: { w: 24, h: 12 },
    demo: { title: "我的知识库", subtitle: "Personal Knowledge Base" },
  },

  async render({ el, app, props, h, empty, cfg }) {
    let src = "";
    const raw = String(props.image || "");
    if (/^https?:\/\//.test(raw)) {
      src = raw;
    } else if (raw) {
      const f = app.vault.getAbstractFileByPath(cfg.path(raw));
      if (f) src = app.vault.getResourcePath(f);
    }

    if (!src && !props.title) {
      el.appendChild(empty("还没有设置图片", "点⚙填 image，可以是库里的图片路径，也可以是网址"));
      return;
    }

    const box = h("div.wb-banner", { class: `is-${props.align || "bottom"}${props.overlay ? " has-overlay" : ""}` });
    if (src) box.appendChild(h("img.wb-banner-img", { src, alt: "", loading: "lazy" }));
    box.appendChild(
      h("div.wb-banner-text", null,
        props.title ? h("div.wb-banner-title", { text: props.title }) : null,
        props.subtitle ? h("div.wb-banner-sub", { text: props.subtitle }) : null
      )
    );

    if (props.link) {
      box.classList.add("is-linked");
      box.addEventListener("click", () => app.workspace.openLinkText(cfg.path(props.link), "", false));
    }
    el.appendChild(box);
  },
})
