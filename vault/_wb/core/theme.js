/* core/theme.js · 主题解析、元信息读取与按需注入
 *
 * 主题 = 一组 --wb-* CSS 变量，仅此而已。组件绝不写死颜色，换主题
 * 才能是「改一个字段」而不是「重写组件」。
 *
 * 主题的名字、说明、配色样本不另立清单文件，而是写在各自 CSS 的头部
 * 注释里（@name / @en / @desc / @font / @swatch）—— 一个主题永远只有
 * 一个文件，丢一个 css 进 themes/ 就自动出现在菜单里。 */
(WB) => {
  const injected = new Set();
  const metaCache = new Map();

  /* 优先级：调用参数 theme > 笔记 frontmatter wbTheme > config.json */
  function resolve(input, dv) {
    if (input && input.theme) return String(input.theme);
    try {
      const fm = dv.current();
      if (fm && fm.wbTheme) return String(fm.wbTheme);
    } catch (e) {
      /* dv.current() 在某些渲染场景下不可用，忽略 */
    }
    return WB.config.data.theme || "sujian";
  }

  function parseMeta(id, css) {
    const get = (key, dflt) => {
      const m = css && css.match(new RegExp("@" + key + "[ \\t]+([^\\n\\r]+)"));
      return m ? m[1].trim().replace(/\s*\*+\/?\s*$/, "").trim() : dflt;
    };
    return {
      id,
      name: get("name", id),
      en: get("en", id),
      desc: get("desc", ""),
      font: get("font", ""),
      swatch: get("swatch", "").split(/[\s,]+/).filter((s) => /^#|^var\(/.test(s)),
    };
  }

  async function meta(id) {
    if (metaCache.has(id) && !WB.config.data.dev) return metaCache.get(id);
    const css = await WB.tryRead(`themes/${id}.css`);
    const info = parseMeta(id, css || "");
    metaCache.set(id, info);
    return info;
  }

  /* 把「宣纸」「Xuan Paper」「xuanzhi」都解析成同一个 id。
   * 文件名保持 ASCII（跨平台和 git 上最省事），但配置和 frontmatter 里
   * 想写中文就写中文 —— 这是个中文优先的库，不该逼人拼拼音。 */
  let nameIndex = null;
  async function buildIndex(app) {
    if (nameIndex && !WB.config.data.dev) return nameIndex;
    nameIndex = new Map();
    for (const id of WB.runtime.listThemes(app)) {
      const m = await meta(id);
      nameIndex.set(id, id);
      if (m.name) nameIndex.set(m.name, id);
      if (m.en) nameIndex.set(m.en.toLowerCase(), id);
    }
    return nameIndex;
  }

  async function canonical(name, app) {
    const n = String(name || "").trim();
    if (!n) return "sujian";
    // 先按文件名直接命中，命中就不用把 10 个主题全读一遍
    if ((await WB.tryRead(`themes/${n}.css`)) != null) return n;
    const idx = await buildIndex(app);
    return idx.get(n) || idx.get(n.toLowerCase()) || n;
  }

  async function ensure(name) {
    const dev = WB.config.data.dev;
    if (injected.has(name) && !dev) return;

    const css = await WB.tryRead(`themes/${name}.css`);
    if (css == null) {
      // 主题文件缺失不该让整页崩掉：退回默认，并在控制台留个记录
      console.warn(`[Workbench] 找不到主题 "${name}"，已退回 sujian`);
      if (name !== "sujian") return ensure("sujian");
      return;
    }
    WB.runtime.injectStyle(`theme-${name}`, css);
    injected.add(name);
  }

  return { resolve, ensure, meta, parseMeta, canonical };
}
