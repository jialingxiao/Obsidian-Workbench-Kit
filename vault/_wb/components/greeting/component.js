/* 组件 · greeting 问候语
 * 按钟点变化的一句话。放在首页最上面，比一个静态标题更有「今天」感。 */
(WB) => {
  const SLOTS = [
    { until: 5,  zh: "夜深了",   en: "Still up" },
    { until: 9,  zh: "早上好",   en: "Good morning" },
    { until: 12, zh: "上午好",   en: "Good morning" },
    { until: 14, zh: "中午好",   en: "Good afternoon" },
    { until: 18, zh: "下午好",   en: "Good afternoon" },
    { until: 23, zh: "晚上好",   en: "Good evening" },
    { until: 24, zh: "夜深了",   en: "Still up" },
  ];

  return {
    meta: {
      id: "greeting",
      group: "header",
      name: { zh: "问候语", en: "Greeting" },
      desc: { zh: "按钟点变化的问候语，可带一句副标题", en: "Time-aware greeting with an optional subtitle" },
      props: {
        name:     { type: "text", default: "",  desc: "称呼，如你的名字" },
        subtitle: { type: "text", default: "",  desc: "下面那行小字" },
        showDate: { type: "bool", default: true, desc: "显示日期与星期" },
        align:    { type: "enum", default: "left", options: ["left", "center", "right"], desc: "对齐方式" },
      },
      layout: { w: 6, h: 4 },
      demo: { name: "霄哥", subtitle: "今天想写点什么？" },
    },

    async render({ el, props, h, i18n }) {
      const d = new Date();
      const hour = d.getHours();
      const slot = SLOTS.find((s) => hour < s.until) || SLOTS[SLOTS.length - 1];
      const word = i18n.locale() === "en" ? slot.en : slot.zh;

      const box = h("div.wb-greet", { class: `is-${props.align || "left"}` },
        h("div.wb-greet-main", { text: props.name ? `${word}，${props.name}` : word }),
        props.subtitle ? h("div.wb-greet-sub", { text: props.subtitle }) : null,
        props.showDate
          ? h("div.wb-greet-date", { text: `${i18n.formatDate(d)} · ${i18n.formatWeekday(d)}` })
          : null
      );
      el.appendChild(box);
    },
  };
}
