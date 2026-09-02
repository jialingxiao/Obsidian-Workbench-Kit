/* 组件 · masthead 报头
 * 首页最上面那一块：刊号 / 大标题 / 头像 / 副标题 / 日期与刊次。
 *
 * 【组件文件的唯一硬性约束】整个文件必须是一个表达式 —— 也就是
 * 一个 (WB) => {...} 箭头函数，不能在它外面再写别的语句。需要私有
 * 辅助函数就写在工厂函数体里面（像下面的 resolveResource）。 */
(WB) => {
  /* 用 getResourcePath 取图片地址，而不是直接写相对 src ——
   * 注入 DOM 的相对路径在阅读模式下解析不稳定，会偶发不显示。 */
  function resolveResource(app, path) {
    try {
      const f = app.vault.getAbstractFileByPath(path);
      return f ? app.vault.getResourcePath(f) : null;
    } catch (e) {
      return null;
    }
  }

  return {
    meta: {
      id: "masthead",
      group: "header",
      name: { zh: "报头", en: "Masthead" },
      desc: {
        zh: "首页顶部标题区，含刊号、大标题、头像、日期与刊次",
        en: "Page header with issue line, title, avatar, date and edition",
      },
      props: {
        title:    { type: "text", default: "",   desc: "主标题，留空则用库名。用 \\n 换行" },
        subtitle: { type: "text", default: "",   desc: "副标题，小号全大写" },
        kicker:   { type: "text", default: "",   desc: "左上角小字，如 Vol. I · No.240" },
        badge:    { type: "text", default: "",   desc: "右上角小字" },
        avatar:   { type: "path", default: "",   desc: "头像图片路径，如 assets/avatar.png" },
        date:     { type: "bool", default: true, desc: "底栏显示日期与星期" },
        edition:  { type: "bool", default: true, desc: "底栏显示刊次（早间版/晚间版…）" },
        inverted: { type: "bool", default: true, desc: "使用反色底块" },
      },
      layout: { w: 24, h: 12 },
      demo: {
        title: "个人知识库",
        subtitle: "Personal Knowledge Base · AI-Maintained Wiki",
        kicker: "Vol. I · No.240",
        badge: "Workbench",
      },
    },

    async render({ el, app, props, h, i18n }) {
      const now = new Date();
      const title = props.title || (app.vault.getName ? app.vault.getName() : "Workbench");

      const box = h("div.wb-mh", { class: props.inverted ? "is-inverted" : "is-plain" });

      // ── 顶栏：刊号 / 角标 ──
      if (props.kicker || props.badge) {
        box.appendChild(
          h("div.wb-mh-top", null,
            h("span", { text: props.kicker || "" }),
            h("span", { text: props.badge || "" })
          )
        );
      }

      // ── 主体：大标题 + 头像 ──
      const titleEl = h("div.wb-mh-title");
      String(title)
        .split(/\\n|\n/)
        .forEach((line, i) => {
          if (i) titleEl.appendChild(h("br"));
          titleEl.appendChild(document.createTextNode(line));
        });

      const body = h("div.wb-mh-body", null, titleEl);

      if (props.avatar) {
        const src = resolveResource(app, props.avatar);
        if (src) {
          body.appendChild(
            h("img.wb-mh-avatar", {
              src,
              alt: "",
              loading: "lazy",
              onerror: (e) => e.target.remove(),
            })
          );
        }
      }
      box.appendChild(body);

      // ── 副标题 ──
      if (props.subtitle) box.appendChild(h("div.wb-mh-sub", { text: props.subtitle }));

      // ── 底栏：日期 / 刊次 ──
      if (props.date || props.edition) {
        box.appendChild(
          h("div.wb-mh-foot", null,
            h("span", { text: props.date ? `${i18n.formatDate(now)} · ${i18n.formatWeekday(now)}` : "" }),
            h("span", { text: props.edition ? i18n.edition(now) : "" })
          )
        );
      }

      el.appendChild(box);
    },
  };
}
