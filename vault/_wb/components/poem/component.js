/* 组件 · poem 诗词
 * 竖排右起的诗词块。和「每日一句」的区别：那个是横排引文，这个是
 * 古籍的竖排版式 —— 配宣纸、水墨、松烟这几套主题才对味。
 *
 * 竖排用 writing-mode: vertical-rl，浏览器原生支持，不需要手动摆字。 */
(WB) => {
  const hashOf = (s) => {
    let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return n;
  };

  /* 从笔记里读：每个空行分隔的段落算一首，首行是标题（可带「——作者」） */
  function parseNote(md) {
    return String(md || "")
      .replace(/^---[\s\S]*?\n---\n?/, "")
      .split(/\n\s*\n/)
      .map((block) => block.split("\n").map((l) => l.replace(/^\s*[-*+#>]\s*/, "").trim()).filter(Boolean))
      .filter((lines) => lines.length >= 2)
      .map((lines) => {
        const head = lines[0].split(/\s*[·—–]\s*/);
        return { title: head[0], author: head[1] || "", lines: lines.slice(1) };
      });
  }

  return {
    meta: {
      id: "poem",
      group: "decor",
      name: { zh: "诗词", en: "Poem" },
      desc: { zh: "竖排右起的诗词块，配宣纸、水墨主题最对味", en: "A vertical, right-to-left poem block" },
      props: {
        note:     { type: "path",  default: "", desc: "诗词来源笔记：空行分段，每段首行是「标题 · 作者」" },
        items:    { type: "array", default: [], desc: "直接写 [{ title, author, lines: [...] }]（没填 note 时用）" },
        mode:     { type: "enum",  default: "daily", options: ["daily", "random"], desc: "daily 每天一首" },
        vertical: { type: "bool",  default: true, desc: "竖排右起（关掉则横排）" },
        showMeta: { type: "bool",  default: true, desc: "显示标题与作者" },
      },
      layout: { w: 4, h: 8 },
      demo: {
        items: [{
          title: "山中问答", author: "李白",
          lines: ["问余何意栖碧山", "笑而不答心自闲", "桃花流水窅然去", "别有天地非人间"],
        }],
      },
    },

    async render({ el, app, props, h, empty, cfg }) {
      let list = [];
      if (props.note) {
        const f = app.vault.getAbstractFileByPath(cfg.path(props.note));
        if (f) list = parseNote(await app.vault.cachedRead(f));
      }
      if (!list.length && Array.isArray(props.items)) {
        list = props.items.filter((x) => x && Array.isArray(x.lines) && x.lines.length);
      }

      if (!list.length) {
        el.appendChild(empty("还没有诗词", "指定一篇诗词笔记（note），或直接填 items"));
        return;
      }

      const idx = props.mode === "random"
        ? Math.floor(Math.random() * list.length)
        : hashOf(new Date().toDateString()) % list.length;
      const poem = list[idx];

      const box = h("div.wb-poem", { class: props.vertical ? "is-vertical" : "is-horizontal" });
      const body = h("div.wb-poem-body");
      for (const line of poem.lines) body.appendChild(h("div.wb-poem-line", { text: line }));
      box.appendChild(body);

      if (props.showMeta && (poem.title || poem.author)) {
        box.appendChild(h("div.wb-poem-meta", null,
          poem.title ? h("span.wb-poem-title", { text: poem.title }) : null,
          poem.author ? h("span.wb-poem-author", { text: poem.author }) : null
        ));
      }
      el.appendChild(box);
    },
  };
}
