/* 组件 · spotlight 今日精选
 * 每天从指定范围里挑一篇推到眼前。daily 模式按日期取模，所以一整天
 * 都是同一篇（刷新不会变），这正是「今日」该有的行为。 */
(WB) => {
  const hashOf = (s) => {
    let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return n;
  };

  return {
    meta: {
      id: "spotlight",
      group: "notes",
      name: { zh: "今日精选", en: "Spotlight" },
      desc: {
        zh: "每天从库里挑一篇笔记推荐给你，也可切换成随机漫游",
        en: "Surfaces one note a day, or roll a random one",
      },
      props: {
        source:    { type: "path", default: "",      desc: "挑选范围，支持 @别名" },
        mode:      { type: "enum", default: "daily", options: ["daily", "random"], desc: "daily 每天一篇，random 可手动换" },
        descField: { type: "text", default: "一句话描述", desc: "摘要字段名，多个用逗号分隔" },
        label:     { type: "text", default: "",      desc: "分区标题" },
        kicker:    { type: "text", default: "今日精选", desc: "左上角小标签" },
      },
      layout: { w: 14, h: 10 },
      demo: { kicker: "Today's Pick · 今日精选" },
    },

    async render({ el, dv, props, h, q, link, empty }) {
      const pages = q.pages(dv, props.source);
      const box = h("div.wb-spot");

      if (props.label) {
        box.appendChild(h("div.wb-head", null, h("span.wb-head-label", { text: props.label })));
      }

      if (!pages.length) {
        box.appendChild(empty("这个范围里还没有笔记", props.source ? `范围：${props.source}` : "先写几篇再来"));
        el.appendChild(box);
        return;
      }

      const fields = String(props.descField || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const card = h("div.wb-spot-card");
      box.appendChild(card);

      let idx =
        props.mode === "random"
          ? Math.floor(Math.random() * pages.length)
          : hashOf(new Date().toDateString()) % pages.length;

      const paint = () => {
        WB.dom.clear(card);
        const p = pages[idx];
        const desc = fields.length ? q.field(p, ...fields) : null;

        const head = h("div.wb-spot-kicker", null,
          h("span.wb-spot-label", { text: props.kicker || "" }),
          h("span.wb-spot-num", { text: `${idx + 1} / ${pages.length}` })
        );

        const title = link(p.file.path, p.file.name);
        title.classList.add("wb-spot-title");

        card.appendChild(head);
        card.appendChild(h("div.wb-spot-rule"));
        card.appendChild(title);
        if (desc) card.appendChild(h("div.wb-spot-desc", { text: String(desc) }));

        if (props.mode === "random") {
          const again = h("button.wb-spot-again", { type: "button", text: "换一篇" });
          again.addEventListener("click", () => {
            idx = Math.floor(Math.random() * pages.length);
            paint();
          });
          card.appendChild(again);
        }
      };

      paint();
      el.appendChild(box);
    },
  };
}
