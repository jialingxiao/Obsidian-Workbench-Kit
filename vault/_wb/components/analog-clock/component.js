/* 组件 · analog-clock 表盘
 * SVG 指针钟。和数字钟的区别不只是好看：指针能让人一眼看出「还剩多少」，
 * 数字只能读出「几点」。
 *
 * 定时器靠 el.isConnected 自清理 —— 块被删掉或重新挂载时旧的会自己停。 */
(WB) => ({
  meta: {
    id: "analog-clock",
    group: "decor",
    name: { zh: "表盘", en: "Analog Clock" },
    desc: { zh: "SVG 指针钟，可显示秒针与刻度", en: "An SVG analog clock face" },
    props: {
      showSeconds: { type: "bool", default: true,  desc: "显示秒针" },
      showTicks:   { type: "bool", default: true,  desc: "显示刻度" },
      showNumbers: { type: "bool", default: false, desc: "显示 12/3/6/9" },
      size:        { type: "number", default: 120, desc: "直径（像素）" },
      align:       { type: "enum", default: "center", options: ["left", "center", "right"] },
    },
    layout: { w: 6, h: 10 },
    demo: { showNumbers: true },
  },

  async render({ el, props, h }) {
    const NS = "http://www.w3.org/2000/svg";
    const size = Math.max(60, Math.min(320, Number(props.size) || 120));
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("class", "wb-ac-svg");

    const face = document.createElementNS(NS, "circle");
    face.setAttribute("cx", "50"); face.setAttribute("cy", "50"); face.setAttribute("r", "46");
    face.setAttribute("class", "wb-ac-face");
    svg.appendChild(face);

    if (props.showTicks) {
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const major = i % 5 === 0;
        const r1 = major ? 38 : 41.5, r2 = 44;
        const t = document.createElementNS(NS, "line");
        t.setAttribute("x1", (50 + r1 * Math.sin(a)).toFixed(2));
        t.setAttribute("y1", (50 - r1 * Math.cos(a)).toFixed(2));
        t.setAttribute("x2", (50 + r2 * Math.sin(a)).toFixed(2));
        t.setAttribute("y2", (50 - r2 * Math.cos(a)).toFixed(2));
        t.setAttribute("class", major ? "wb-ac-tick is-major" : "wb-ac-tick");
        svg.appendChild(t);
      }
    }

    if (props.showNumbers) {
      for (const [n, x, y] of [[12, 50, 16], [3, 84, 51.5], [6, 50, 88], [9, 16, 51.5]]) {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", String(x)); t.setAttribute("y", String(y));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("dominant-baseline", "central");
        t.setAttribute("class", "wb-ac-num");
        t.textContent = String(n);
        svg.appendChild(t);
      }
    }

    const hand = (cls, len, width) => {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", "50"); l.setAttribute("y1", "50");
      l.setAttribute("class", `wb-ac-hand ${cls}`);
      l.setAttribute("stroke-width", String(width));
      l.dataset.len = String(len);
      svg.appendChild(l);
      return l;
    };
    const hH = hand("is-hour", 25, 3.4);
    const hM = hand("is-min", 35, 2.4);
    const hS = props.showSeconds ? hand("is-sec", 39, 1) : null;

    const pin = document.createElementNS(NS, "circle");
    pin.setAttribute("cx", "50"); pin.setAttribute("cy", "50"); pin.setAttribute("r", "2");
    pin.setAttribute("class", "wb-ac-pin");
    svg.appendChild(pin);

    const point = (el2, angle) => {
      const len = Number(el2.dataset.len);
      el2.setAttribute("x2", (50 + len * Math.sin(angle)).toFixed(2));
      el2.setAttribute("y2", (50 - len * Math.cos(angle)).toFixed(2));
    };

    const tick = () => {
      const d = new Date();
      const s = d.getSeconds(), m = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + m / 60;
      point(hH, (hr / 12) * Math.PI * 2);
      point(hM, (m / 60) * Math.PI * 2);
      if (hS) point(hS, (s / 60) * Math.PI * 2);
    };

    el.appendChild(h("div.wb-ac", { class: `is-${props.align || "center"}` }, svg));
    tick();
    const id = setInterval(() => {
      if (!el.isConnected) return clearInterval(id);
      tick();
    }, props.showSeconds ? 1000 : 20000);
  },
})
