/* 组件 · image 图片 / 图集
 * 单张图配说明，或一个文件夹的图墙。首页全是数据和列表会很干，
 * 一张图能让整页喘口气。
 *
 * 图片路径一律走 getResourcePath 解析，不用相对 src —— 注入 DOM 的
 * 相对路径在阅读模式下解析不稳定，会偶发不显示。 */
(WB) => {
  const IMG_EXT = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "bmp"]);

  function resolve(app, path) {
    if (/^https?:\/\//.test(path)) return path;
    try {
      const f = app.vault.getAbstractFileByPath(path);
      return f ? app.vault.getResourcePath(f) : null;
    } catch (e) {
      return null;
    }
  }

  return {
    meta: {
      id: "image",
      group: "decor",
      name: { zh: "图片", en: "Image" },
      desc: { zh: "单张图配说明，或一个文件夹的图墙", en: "A single image with a caption, or a folder gallery" },
      props: {
        src:     { type: "path",   default: "",  desc: "图片路径（库内）或 http 网址。填了就是单图模式" },
        folder:  { type: "path",   default: "",  desc: "图集模式：这个文件夹里的图片，支持 @别名" },
        caption: { type: "text",   default: "",  desc: "图下说明（单图模式）" },
        link:    { type: "path",   default: "",  desc: "点击后打开的笔记" },
        columns: { type: "number", default: 3,   desc: "图集列数" },
        limit:   { type: "number", default: 9,   desc: "图集最多显示几张" },
        fit:     { type: "enum",   default: "cover", options: ["cover", "contain"], desc: "裁切还是完整显示" },
        rounded: { type: "bool",   default: true, desc: "圆角" },
        label:   { type: "text",   default: "",  desc: "分区标题" },
      },
      layout: { w: 8, h: 12 },
      demo: { caption: "把库里的图片路径填进 src 就能显示" },
    },

    async render({ el, app, props, h, ui, empty, cfg }) {
      const box = h("div.wb-img", { class: props.rounded ? "is-rounded" : "" });
      const headEl = ui.head(props.label);
      if (headEl) box.appendChild(headEl);

      // ── 图集 ──
      if (props.folder) {
        const base = cfg.path(props.folder) || "";
        const prefix = base ? base.replace(/\/$/, "") + "/" : "";
        const files = app.vault.getFiles()
          .filter((f) => f.path.startsWith(prefix) && IMG_EXT.has((f.path.split(".").pop() || "").toLowerCase()))
          .sort((a, b) => a.path.localeCompare(b.path))
          .slice(0, Math.max(1, Math.min(60, Number(props.limit) || 9)));

        if (!files.length) {
          box.appendChild(empty("这个文件夹里没有图片", `范围：${base || props.folder}`));
          el.appendChild(box);
          return;
        }

        const grid = h("div.wb-img-grid", {
          style: { "--wb-img-cols": String(Math.max(1, Math.min(6, Number(props.columns) || 3))) },
        });
        for (const f of files) {
          const src = resolve(app, f.path);
          if (!src) continue;
          const cell = h("div.wb-img-cell", { class: `is-${props.fit}` },
            h("img", { src, alt: "", loading: "lazy", onerror: (e) => e.target.closest(".wb-img-cell")?.remove() })
          );
          cell.addEventListener("click", () => app.workspace.openLinkText(f.path, "", false));
          grid.appendChild(cell);
        }
        box.appendChild(grid);
        el.appendChild(box);
        return;
      }

      // ── 单图 ──
      const raw = String(props.src || "");
      const src = raw ? resolve(app, cfg.path(raw)) : null;
      if (!src) {
        box.appendChild(empty("还没有设置图片", "点⚙填 src（单图）或 folder（图集）"));
        el.appendChild(box);
        return;
      }

      const fig = h("figure.wb-img-one", { class: `is-${props.fit}` },
        h("img", { src, alt: props.caption || "", loading: "lazy" }),
        props.caption ? h("figcaption", { text: props.caption }) : null
      );
      if (props.link) {
        fig.classList.add("is-linked");
        fig.addEventListener("click", () => app.workspace.openLinkText(cfg.path(props.link), "", false));
      }
      box.appendChild(fig);
      el.appendChild(box);
    },
  };
}
