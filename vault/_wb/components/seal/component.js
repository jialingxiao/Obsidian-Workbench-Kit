/* 组件 · seal 印章
 * 一枚朱红闲章。纯 SVG，字随着字数自动排 —— 两字并排、四字田字格、
 * 其余竖排。配宣纸和朱砂两套主题最合适。
 *
 * 装饰组件也该守规矩：颜色走 --wb-accent，所以换主题时它跟着变，
 * 不会在青瓷底上突然冒出一块朱红。 */
(WB) => {
  /* 印文布局。返回值是「列的数组」，每列自上而下，第 0 列在最右
   * —— 篆刻的读序是自右向左、自上而下。
   *
   * 三字以内一列竖排；四字以上分两列，前半在右列。
   * （早先版本把两列的字交错着填，结果「知之为知之」排成了
   *   「知知/之之/为」，读起来完全不对。） */
  function layout(chars) {
    if (chars.length <= 3) return [chars];
    const half = Math.ceil(chars.length / 2);
    return [chars.slice(0, half), chars.slice(half)].filter((c) => c.length);
  }

  return {
    meta: {
      id: "seal",
      group: "decor",
      name: { zh: "印章", en: "Seal" },
      desc: { zh: "一枚朱红闲章，可刻自定义字", en: "A vermilion seal stamp with your own characters" },
      props: {
        text:   { type: "text",   default: "工作台", desc: "印文，1–8 个字最好看" },
        style:  { type: "enum",   default: "yang", options: ["yang", "yin"], desc: "yang 朱文（字红底白），yin 白文（字白底红）" },
        shape:  { type: "enum",   default: "square", options: ["square", "round"], desc: "方章或圆章" },
        size:   { type: "number", default: 92,   desc: "边长（像素）" },
        align:  { type: "enum",   default: "center", options: ["left", "center", "right"] },
        caption:{ type: "text",   default: "",   desc: "印章下方的小字" },
      },
      layout: { w: 3, h: 4 },
      demo: { text: "知之为知之", caption: "个人知识库" },
    },

    async render({ el, props, h }) {
      const chars = [...String(props.text || "").trim()].filter((c) => c.trim());
      const cols = chars.length ? layout(chars) : [["印"]];
      const rows = Math.max(...cols.map((c) => c.length));
      const size = Math.max(48, Math.min(240, Number(props.size) || 92));
      const yin = props.style === "yin";

      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("class", `wb-seal-svg${yin ? " is-yin" : ""}`);
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));

      // 边框：朱文是粗边细字，白文是整块红底
      const frame = document.createElementNS(NS, props.shape === "round" ? "circle" : "rect");
      if (props.shape === "round") {
        frame.setAttribute("cx", "50"); frame.setAttribute("cy", "50"); frame.setAttribute("r", "46");
      } else {
        frame.setAttribute("x", "4"); frame.setAttribute("y", "4");
        frame.setAttribute("width", "92"); frame.setAttribute("height", "92");
        frame.setAttribute("rx", "3");
      }
      frame.setAttribute("class", "wb-seal-frame");
      svg.appendChild(frame);

      /* 字沿着列铺开：右列在前，符合篆刻自右向左的读序 */
      const colW = 92 / cols.length;
      cols.forEach((col, ci) => {
        const rowH = 92 / Math.max(col.length, 1);
        col.forEach((ch, ri) => {
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", (100 - 4 - colW * (ci + 0.5)).toFixed(2));
          t.setAttribute("y", (4 + rowH * (ri + 0.5)).toFixed(2));
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("dominant-baseline", "central");
          t.setAttribute("font-size", (Math.min(colW, rowH) * 0.78).toFixed(2));
          t.setAttribute("class", "wb-seal-char");
          t.textContent = ch;
          svg.appendChild(t);
        });
      });

      const box = h("div.wb-seal", { class: `is-${props.align || "center"}` });
      box.appendChild(svg);
      if (props.caption) box.appendChild(h("div.wb-seal-cap", { text: props.caption }));
      el.appendChild(box);
    },
  };
}
