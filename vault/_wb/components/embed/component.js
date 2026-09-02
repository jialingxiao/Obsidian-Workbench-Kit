/* 组件 · embed 嵌入笔记
 * 把某篇笔记（或它的某个小节）的内容渲染进来。用 Obsidian 自己的
 * markdown 渲染器，所以双链、图片、callout 一切照常工作。 */
(WB) => {
  /* 抠出某个二级标题下的内容，直到下一个同级或更高级标题 */
  function section(md, heading) {
    const lines = String(md).split("\n");
    const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.replace(/^#+\s*/, "").trim() === heading.trim());
    if (start < 0) return null;
    const level = (lines[start].match(/^#+/) || ["#"])[0].length;
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
      const m = lines[i].match(/^(#+)\s/);
      if (m && m[1].length <= level) break;
      out.push(lines[i]);
    }
    return out.join("\n").trim();
  }

  return {
    meta: {
      id: "embed",
      group: "layout",
      name: { zh: "嵌入笔记", en: "Embed Note" },
      desc: { zh: "把一篇笔记或它的某个小节渲染到看板里", en: "Render a note (or one of its sections) inside the board" },
      props: {
        note:        { type: "path", default: "", desc: "要嵌入的笔记路径，支持 @别名" },
        heading:     { type: "text", default: "", desc: "只嵌入这个标题下的内容，留空则整篇" },
        stripFront:  { type: "bool", default: true, desc: "去掉 frontmatter" },
        showTitle:   { type: "bool", default: true, desc: "顶部显示可点击的笔记名" },
      },
      layout: { w: 12, h: 16 },
      demo: {},
    },

    async render({ el, app, dv, props, h, link, empty, cfg }) {
      if (!props.note) {
        el.appendChild(empty("还没有指定笔记", "点⚙填 note，例如 @notes/周计划"));
        return;
      }

      const path = cfg.path(props.note);
      const file = app.vault.getAbstractFileByPath(path.endsWith(".md") ? path : path + ".md")
        || app.vault.getAbstractFileByPath(path);
      if (!file) {
        el.appendChild(empty(`找不到笔记：${path}`, "检查路径，或去掉 .md 再试"));
        return;
      }

      let md = await app.vault.cachedRead(file);
      if (props.stripFront) md = md.replace(/^---[\s\S]*?\n---\n?/, "");
      if (props.heading) {
        const part = section(md, props.heading);
        if (part == null) {
          el.appendChild(empty(`笔记里没有标题「${props.heading}」`, "改成整篇嵌入就把 heading 留空"));
          return;
        }
        md = part;
      }

      const box = h("div.wb-embed");
      if (props.showTitle) {
        // basename 理论上一定有，但兜一层：没有时从路径推，别把整条路径当标题显示
        const title = file.basename || (file.name || file.path).split("/").pop().replace(/\.md$/, "");
        const t = link(file.path, title);
        t.classList.add("wb-embed-title");
        box.appendChild(t);
      }
      const body = h("div.wb-embed-body.markdown-rendered");
      box.appendChild(body);
      el.appendChild(box);

      /* 交给 Obsidian 自己的 markdown 渲染器，双链/图片/callout 才照常工作。
       * 取用方式和签名在不同版本里都变过，而且 dataviewjs 里 require 未必
       * 存在，所以逐级降级；最后兜底用 Dataview 的渲染器，也比退成纯文本好。 */
      const obs = (() => {
        try { return (typeof require === "function" && require("obsidian")) || window.obsidian || null; }
        catch (e) { return window.obsidian || null; }
      })();

      const MR = obs && obs.MarkdownRenderer;
      const cmp = dv.component || dv;

      if (MR && typeof MR.render === "function") {
        await MR.render(app, md, body, file.path, cmp);        // Obsidian 1.5+
      } else if (MR && typeof MR.renderMarkdown === "function") {
        await MR.renderMarkdown(md, body, file.path, cmp);     // 旧签名，无 app 参数
      } else {
        await WB.query.renderWith(dv, body, () => dv.paragraph(md));
      }
    },
  };
}
