/* 组件 · vault-info 库总览
 * 一眼看清这个库有多大：笔记数、总字数、附件、标签、最早的一篇。
 * 字数统计要读全部文件内容，所以默认关掉，需要时再开。 */
(WB) => {
  const fmt = (n) => (n >= 10000 ? (n / 10000).toFixed(1) + " 万" : String(n));

  return {
    meta: {
      id: "vault-info",
      group: "metrics",
      name: { zh: "库总览", en: "Vault Info" },
      desc: { zh: "笔记数、附件数、标签数、最早的一篇等库级信息", en: "Vault-level facts: notes, attachments, tags, oldest note" },
      props: {
        showWords:  { type: "bool", default: false, desc: "统计总字数（要读全部笔记内容，库大时会慢）" },
        showOldest: { type: "bool", default: true,  desc: "显示最早的一篇" },
        label:      { type: "text", default: "",    desc: "分区标题" },
      },
      layout: { w: 5, h: 6 },
      demo: { label: "库总览" },
    },

    async render({ el, dv, app, props, h, q, ui, link, i18n }) {
      const files = app.vault.getFiles();
      const notes = files.filter((f) => f.path.endsWith(".md"));
      const attachments = files.length - notes.length;

      const pages = q.pages(dv, "");
      const tagSet = new Set();
      for (const p of pages) {
        const tags = (p.file && p.file.tags) || [];
        for (const t of tags.array ? tags.array() : tags) tagSet.add(String(t));
      }

      let oldest = null;
      for (const p of pages) {
        const d = q.timeOf(p, "ctime");
        if (d && (!oldest || d < oldest.d)) oldest = { d, p };
      }

      const rows = [
        { k: "笔记", v: fmt(notes.length) },
        { k: "附件", v: fmt(attachments) },
        { k: "标签", v: fmt(tagSet.size) },
      ];

      if (props.showWords) {
        let words = 0;
        for (const f of notes) {
          try {
            const md = await app.vault.cachedRead(f);
            // 中文按字算、西文按词算，混排库里这样估得最接近直觉
            words += (md.match(/[一-龥]/g) || []).length
                   + (md.match(/[A-Za-z0-9]+/g) || []).length;
          } catch (e) { /* 读不了就跳过 */ }
        }
        rows.push({ k: "字数", v: fmt(words) });
      }

      const box = h("div.wb-vi");
      const head = ui.head(props.label);
      if (head) box.appendChild(head);

      const grid = h("div.wb-vi-grid");
      for (const r of rows) {
        grid.appendChild(
          h("div.wb-vi-item", null,
            h("div.wb-vi-val.wb-num", { text: r.v }),
            h("div.wb-vi-key", { text: r.k })
          )
        );
      }
      box.appendChild(grid);

      if (props.showOldest && oldest) {
        const line = h("div.wb-vi-oldest", null,
          h("span.wb-vi-oldest-label", { text: `最早的一篇 · ${i18n.formatDate(oldest.d)}　` })
        );
        line.appendChild(link(oldest.p.file.path, oldest.p.file.name));
        box.appendChild(line);
      }

      el.appendChild(box);
    },
  };
}
