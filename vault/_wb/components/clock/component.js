/* 组件 · clock 时钟
 * 会走的大时钟 + 日期。定时器靠 el.isConnected 自清理 —— 块被删掉或
 * 重新挂载时旧的 interval 会自己停，不会越攒越多。 */
(WB) => ({
  meta: {
    id: "clock",
    group: "header",
    name: { zh: "时钟", en: "Clock" },
    desc: { zh: "实时时钟与日期", en: "A live clock with the date" },
    props: {
      showSeconds: { type: "bool", default: false, desc: "显示秒" },
      showDate:    { type: "bool", default: true,  desc: "显示日期与星期" },
      hour12:      { type: "bool", default: false, desc: "12 小时制" },
      align:       { type: "enum", default: "left", options: ["left", "center", "right"], desc: "对齐方式" },
    },
    layout: { w: 6, h: 8 },
    demo: { showSeconds: true },
  },

  async render({ el, props, h, i18n }) {
    const box = h("div.wb-clock", { class: `is-${props.align || "left"}` });
    const time = h("div.wb-clock-time.wb-num");
    const date = h("div.wb-clock-date");
    box.appendChild(time);
    if (props.showDate) box.appendChild(date);
    el.appendChild(box);

    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      let hh = d.getHours();
      let suffix = "";
      if (props.hour12) {
        suffix = hh < 12 ? " AM" : " PM";
        hh = hh % 12 || 12;
      }
      time.textContent =
        `${props.hour12 ? hh : pad(hh)}:${pad(d.getMinutes())}` +
        (props.showSeconds ? `:${pad(d.getSeconds())}` : "") + suffix;
      if (props.showDate) date.textContent = `${i18n.formatDate(d)} · ${i18n.formatWeekday(d)}`;
    };

    tick();
    const id = setInterval(() => {
      if (!el.isConnected) return clearInterval(id);
      tick();
    }, props.showSeconds ? 1000 : 15000);
  },
})
