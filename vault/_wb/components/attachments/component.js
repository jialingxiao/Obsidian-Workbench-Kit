/* 组件 · attachments 附件体检
 * 库大了之后的实际痛点：图片越攒越多，其中一部分早就没人引用了。
 *
 * 「没被引用」的判断用 metadataCache.resolvedLinks —— 它把链接和嵌入
 * 都解析成了「源文件 → 目标文件」，反过来数一遍就知道谁没人指向。
 * 两种运行模式下都能拿到，不依赖 Dataview。 */
(WB) => {
  /* 「非 md 文件」不等于「附件」：真实库里 _wb/ 下的 js/css、插件带进来的
     文件都会落进来，列出来只是噪音。默认只认常见的附件类型。 */
  const DEFAULT_EXT = "png,jpg,jpeg,gif,svg,webp,avif,pdf,mp4,mov,mp3,wav,m4a,zip,docx,xlsx,pptx,canvas,excalidraw";

  const KB = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}M` : `${Math.max(1, Math.round(n / 1024))}K`);

  return {
    meta: {
      id: "attachments",
      group: "metrics",
      name: { zh: "附件体检", en: "Attachments" },
      desc: {
        zh: "找出最占地方的附件，或已经没人引用的附件",
        en: "Largest attachments, or ones nothing links to any more",
      },
      props: {
        mode:   { type: "enum",   default: "unused", options: ["unused", "largest"], desc: "unused 查无人引用，largest 查最占地方" },
        folder: { type: "path",   default: "",  desc: "只看某个文件夹，留空为全库" },
        ext:    { type: "text",   default: "",  desc: "只看这些扩展名，逗号分隔。留空用默认的常见附件类型" },
        limit:  { type: "number", default: 8,   desc: "最多显示几条" },
        label:  { type: "text",   default: "",  desc: "分区标题" },
      },
      layout: { w: 5, h: 6 },
      demo: { label: "附件", mode: "largest", limit: 6 },
    },

    async render({ el, app, props, h, ui, empty, cfg }) {
      const base = cfg.path(props.folder || "") || "";
      const prefix = base ? base.replace(/\/$/, "") + "/" : "";

      const exts = new Set(
        String(props.ext || DEFAULT_EXT).toLowerCase().split(",").map((s) => s.trim().replace(/^\./, "")).filter(Boolean)
      );
      const extOf = (p) => (p.includes(".") ? p.split(".").pop().toLowerCase() : "");

      const files = app.vault.getFiles().filter(
        (f) => exts.has(extOf(f.path)) && (!prefix || f.path.startsWith(prefix))
      );

      const box = h("div.wb-at");
      const totalSize = files.reduce((n, f) => n + (f.stat?.size || 0), 0);
      const headEl = ui.head(props.label, files.length ? `${files.length} 个 · ${KB(totalSize)}` : null);
      if (headEl) box.appendChild(headEl);

      if (!files.length) {
        box.appendChild(empty("这里没有附件", prefix ? `范围：${base}` : "库里还没有图片或其他附件"));
        el.appendChild(box);
        return;
      }

      const limit = Math.max(1, Math.min(40, Number(props.limit) || 8));
      let rows;

      if (props.mode === "largest") {
        rows = files
          .filter((f) => f.stat?.size)
          .sort((a, b) => b.stat.size - a.stat.size || a.path.localeCompare(b.path))
          .slice(0, limit)
          .map((f) => ({ path: f.path, name: f.name || f.path.split("/").pop(), meta: KB(f.stat.size) }));
      } else {
        // 被引用过的目标集合：把 resolvedLinks 的所有目标摊平
        const referenced = new Set();
        const resolved = app.metadataCache?.resolvedLinks || {};
        for (const targets of Object.values(resolved)) {
          for (const to of Object.keys(targets)) referenced.add(to);
        }
        const unused = files.filter((f) => !referenced.has(f.path));
        rows = unused
          .sort((a, b) => (b.stat?.size || 0) - (a.stat?.size || 0) || a.path.localeCompare(b.path))
          .slice(0, limit)
          .map((f) => ({ path: f.path, name: f.name || f.path.split("/").pop(),
                         sub: f.path.includes("/") ? f.path.replace(/\/[^/]+$/, "") : null,
                         meta: f.stat?.size ? KB(f.stat.size) : "" }));

        if (!rows.length) {
          box.appendChild(empty("每个附件都还有人引用", "干净"));
          el.appendChild(box);
          return;
        }
        const wasted = unused.reduce((n, f) => n + (f.stat?.size || 0), 0);
        box.appendChild(h("div.wb-at-note", { text: `${unused.length} 个没人引用 · 共 ${KB(wasted)}` }));
      }

      box.appendChild(ui.noteList(rows));
      el.appendChild(box);
    },
  };
}
