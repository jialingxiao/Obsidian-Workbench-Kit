/* 组件 · lunar 农历
 * 今天的农历日期、干支生肖，可选显示节气和距春节还有几天。
 *
 * 历法计算在 core/astro.js，用天文法（Meeus）而不是查表：查表要写
 * 两百个十六进制常数，错了很难发现，而农历算错会安静地显示在首页上。
 * 天文法每一步都能验证 —— scripts/verify-lunar.mjs 拿 11 个春节日期、
 * 3 个闰月位置、7 个农历节日和 168 个节气对过。 */
(WB) => ({
  meta: {
    id: "lunar",
    group: "decor",
    name: { zh: "农历", en: "Lunar Date" },
    desc: {
      zh: "今天的农历日期与干支生肖，可带节气和春节倒数",
      en: "Today's lunar date, sexagenary year and zodiac",
    },
    props: {
      showGanzhi:  { type: "bool", default: true,  desc: "显示干支与生肖" },
      showTerm:    { type: "bool", default: true,  desc: "显示当前节气" },
      showSpring:  { type: "bool", default: false, desc: "显示距春节还有几天" },
      showSolar:   { type: "bool", default: true,  desc: "显示公历日期" },
      align:       { type: "enum", default: "left", options: ["left", "center"] },
    },
    layout: { w: 3, h: 5 },
    demo: { showSpring: true },
  },

  async render({ el, props, h, astro, i18n, empty }) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const lunar = astro.toLunar(now);
    if (!lunar) {
      // 只在超出算法适用范围时才可能发生
      el.appendChild(empty("这个日期超出了历法计算范围", "农历推算支持 1900–2100 年"));
      return;
    }

    const box = h("div.wb-lu", { class: `is-${props.align || "left"}` });

    if (props.showSolar) {
      box.appendChild(h("div.wb-lu-solar", {
        text: `${i18n.formatDate(now)} · ${i18n.formatWeekday(now)}`,
      }));
    }

    box.appendChild(h("div.wb-lu-main", null,
      h("span.wb-lu-month", { text: lunar.monthName }),
      h("span.wb-lu-day", { text: lunar.dayName })
    ));

    if (props.showGanzhi) {
      const gz = astro.ganzhiYear(now);
      box.appendChild(h("div.wb-lu-gz", null,
        h("span.wb-lu-gz-year", { text: `${gz.gan}${gz.zhi}年` }),
        h("span.wb-lu-zodiac", { text: `${gz.zodiac}` })
      ));
    }

    const extra = [];

    if (props.showTerm) {
      /* 找当前所处的节气：把今年前后的节气排一遍，取最后一个不晚于今天的 */
      const today = astro.dayNum(astro.toJD(now.getFullYear(), now.getMonth() + 1, now.getDate()) - 8 / 24);
      const all = [];
      for (const y of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
        for (let i = 0; i < 24; i++) all.push({ name: astro.TERM_NAMES[i], day: astro.termDay(y, i) });
      }
      all.sort((a, b) => a.day - b.day);
      let cur = null, next = null;
      for (const t of all) {
        if (t.day <= today) cur = t;
        else { next = t; break; }
      }
      if (cur) {
        const isToday = cur.day === today;
        extra.push(isToday ? `今日${cur.name}` : `${cur.name}第 ${today - cur.day + 1} 天`);
      }
      if (next) extra.push(`${next.name}还有 ${next.day - today} 天`);
    }

    if (props.showSpring) {
      const today = astro.dayNum(astro.toJD(now.getFullYear(), now.getMonth() + 1, now.getDate()) - 8 / 24);
      let sf = astro.springFestivalDay(now.getFullYear());
      // 今年的春节已经过了，就看明年的
      if (sf != null && sf < today) sf = astro.springFestivalDay(now.getFullYear() + 1);
      if (sf != null) {
        const d = sf - today;
        extra.push(d === 0 ? "今日春节" : `距春节 ${d} 天`);
      }
    }

    if (extra.length) box.appendChild(h("div.wb-lu-extra", { text: extra.join(" · ") }));
    el.appendChild(box);
  },
})
