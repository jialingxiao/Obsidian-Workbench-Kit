/* 组件 · graph 关系图
 * 取被引用最多的 N 篇笔记摆成一圈，画出它们彼此之间的连线。
 *
 * 刻意用径向布局而不是力导向：力导向要跑迭代、要动画、要处理收敛，
 * 在首页上是笔不划算的开销，而且每次刷新位置都不一样，反而难认。
 * 环形是确定的 —— 同一批笔记永远画在同一个位置。
 *
 * 边只从 inlinks 建：两套数据层的 inlinks 都是解析过的真实路径，
 * 而 outlinks 在原生层里是未解析的链接文本，拿来配对会漏。 */
(WB) => ({
  meta: {
    id: "graph",
    group: "metrics",
    name: { zh: "关系图", en: "Link Graph" },
    desc: {
      zh: "把引用最多的笔记摆成一圈，画出彼此之间的链接",
      en: "The most-linked notes arranged in a ring, with the links between them",
    },
    props: {
      source: { type: "path",   default: "",  desc: "范围，支持 @别名" },
      nodes:  { type: "number", default: 12,  desc: "取引用数前几名（3–24）" },
      showLabels: { type: "bool", default: true, desc: "显示笔记名" },
      label:  { type: "text",   default: "",  desc: "分区标题" },
    },
    layout: { w: 10, h: 16 },
    demo: { label: "关系图", nodes: 10 },
  },

  async render({ el, props, dv, h, q, ui, empty }) {
    const n = Math.max(3, Math.min(24, Number(props.nodes) || 12));

    const ranked = q
      .pages(dv, props.source)
      .map((p) => {
        const inb = p.file.inlinks;
        const arr = inb ? (inb.array ? inb.array() : inb) : [];
        return { path: p.file.path, name: p.file.name, deg: arr.length, from: arr.map((l) => l.path || String(l)) };
      })
      .filter((x) => x.deg > 0)
      .sort((a, b) => b.deg - a.deg || a.name.localeCompare(b.name))
      .slice(0, n);

    const box = h("div.wb-gp");
    const headEl = ui.head(props.label, ranked.length ? `Top ${ranked.length}` : null);
    if (headEl) box.appendChild(headEl);

    if (ranked.length < 3) {
      box.appendChild(empty("链接还太少，画不出关系", "多用 [[双链]] 把笔记连起来，这里就会有东西"));
      el.appendChild(box);
      return;
    }

    const inSet = new Map(ranked.map((x, i) => [x.path, i]));
    const edges = [];
    ranked.forEach((node, j) => {
      for (const src of node.from) {
        const i = inSet.get(src);
        if (i != null && i !== j) edges.push([i, j]);
      }
    });

    // 环形布局：从 12 点开始顺时针，位置只取决于排名，所以是确定的
    const R = 38, CX = 50, CY = 50;
    const pos = ranked.map((_, i) => {
      const a = (i / ranked.length) * Math.PI * 2 - Math.PI / 2;
      return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), a };
    });

    const maxDeg = Math.max(...ranked.map((x) => x.deg));
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "wb-gp-svg");
    svg.setAttribute("role", "img");

    for (const [i, j] of edges) {
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", pos[i].x.toFixed(2));
      line.setAttribute("y1", pos[i].y.toFixed(2));
      line.setAttribute("x2", pos[j].x.toFixed(2));
      line.setAttribute("y2", pos[j].y.toFixed(2));
      line.setAttribute("class", "wb-gp-edge");
      svg.appendChild(line);
    }

    ranked.forEach((node, i) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "wb-gp-node");
      g.addEventListener("click", () => WB.app.workspace.openLinkText(node.path, "", false));

      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", pos[i].x.toFixed(2));
      c.setAttribute("cy", pos[i].y.toFixed(2));
      c.setAttribute("r", (1.6 + (node.deg / maxDeg) * 2.6).toFixed(2));
      g.appendChild(c);

      const title = document.createElementNS(NS, "title");
      title.textContent = `${node.name} · ${node.deg} 处引用`;
      g.appendChild(title);

      if (props.showLabels) {
        const t = document.createElementNS(NS, "text");
        // 圆右半边的标签左对齐往外推，左半边反过来，才不会盖住图心
        const right = Math.cos(pos[i].a) >= 0;
        const off = right ? 4.5 : -4.5;
        t.setAttribute("x", (pos[i].x + off).toFixed(2));
        t.setAttribute("y", (pos[i].y + 1).toFixed(2));
        t.setAttribute("text-anchor", right ? "start" : "end");
        t.setAttribute("class", "wb-gp-label");
        t.textContent = node.name.length > 8 ? node.name.slice(0, 8) + "…" : node.name;
        g.appendChild(t);
      }
      svg.appendChild(g);
    });

    box.appendChild(h("div.wb-gp-wrap", null, svg));
    box.appendChild(h("div.wb-gp-foot", { text: `${ranked.length} 个节点 · ${edges.length} 条连线 · 点击圆点打开笔记` }));
    el.appendChild(box);
  },
})
