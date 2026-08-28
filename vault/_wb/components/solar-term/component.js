/* 组件 · solar-term 节气
 * 当前处在哪个节气、距下一个还有几天。
 *
 * 历法计算在 core/astro.js，和农历组件共用同一份天文实现。
 *
 * 早先这里用的是「通用寿星公式」那种拟合近似，有两个问题：闰年 3 月起
 * 会整体差一天（L 项漏了闰日修正），另外 2026 年雨水这类年份本身就是
 * 公式的已知特例。换成天文法后两个问题一起没了 —— 交叉校验过 7 年
 * 168 个节气，只有 2026 雨水一处分歧，且分歧的是寿星公式那边。 */
(WB) => ({
  meta: {
    id: "solar-term",
    group: "decor",
    name: { zh: "节气", en: "Solar Term" },
    desc: {
      zh: "当前节气与距下一个还有几天，天文法计算，不联网不查表",
      en: "The current solar term and days until the next — computed astronomically",
    },
    props: {
      showNext: { type: "bool",   default: true, desc: "显示下一个节气与倒计时" },
      showList: { type: "number", default: 0,    desc: "再往后列出几个（0 = 不列）" },
      align:    { type: "enum",   default: "left", options: ["left", "center"] },
    },
    layout: { w: 3, h: 4 },
    demo: { showList: 3 },
  },

  async render({ el, props, h, astro, i18n }) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = astro.dayNum(astro.toJD(now.getFullYear(), now.getMonth() + 1, now.getDate()) - 8 / 24);

    // 跨年时「当前节气」可能落在去年，所以前后各排一年
    const all = [];
    for (const y of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
      for (let i = 0; i < 24; i++) all.push({ name: astro.TERM_NAMES[i], day: astro.termDay(y, i) });
    }
    all.sort((a, b) => a.day - b.day);

    let curIdx = -1;
    for (let k = 0; k < all.length; k++) if (all[k].day <= today) curIdx = k;
    const cur = all[curIdx] || all[0];
    const next = all[curIdx + 1] || null;

    const box = h("div.wb-st", { class: `is-${props.align || "left"}` });
    const sinceDays = today - cur.day;

    box.appendChild(h("div.wb-st-name", { text: cur.name }));
    box.appendChild(h("div.wb-st-sub", {
      text: sinceDays === 0
        ? `今日${cur.name}`
        : `${i18n.formatDate(new Date(astro.dayToDate(cur.day).y, astro.dayToDate(cur.day).m - 1, astro.dayToDate(cur.day).d))} 入节 · 第 ${sinceDays + 1} 天`,
    }));

    if (props.showNext && next) {
      const days = next.day - today;
      box.appendChild(h("div.wb-st-next", null,
        h("span.wb-st-next-name", { text: next.name }),
        h("span.wb-st-next-days", { text: days === 0 ? "就是今天" : `还有 ${days} 天` })
      ));
    }

    const n = Math.max(0, Math.min(8, Number(props.showList) || 0));
    if (n && next) {
      const list = h("div.wb-st-list");
      for (const t of all.slice(curIdx + 2, curIdx + 2 + n)) {
        const g = astro.dayToDate(t.day);
        list.appendChild(h("div.wb-st-item", null,
          h("span", { text: t.name }),
          h("span.wb-st-date", { text: `${g.m}/${g.d}` })
        ));
      }
      box.appendChild(list);
    }

    el.appendChild(box);
  },
})
