/* core/runtime.js · 组件加载、样式注入、渲染与错误边界
 * 这里是调度器的真正实现。设计目标：任何一个组件出错，都只坏掉
 * 它自己那一块，绝不让整篇首页白屏 —— 给别人用的东西，失败方式
 * 比成功路径更重要。 */
(WB) => {
  const RESERVED = new Set(["c", "component", "root", "theme"]);
  const cache = new Map();

  /* ── 样式注入 ──────────────────────────────────────────────
   * 注入到 document.head 而不是渲染容器：多个实例只注入一次，
   * 并且用户不需要安装任何 CSS 片段。 */
  function injectStyle(key, css) {
    if (!css) return;
    const id = `wb-style-${key}`;
    const dev = WB.config.data.dev;
    let el = document.getElementById(id);
    if (el) {
      if (el.dataset.wbv === WB.version && !dev) return;
      el.remove();
    }
    el = document.createElement("style");
    el.id = id;
    el.dataset.wbv = WB.version;
    el.textContent = css;
    document.head.appendChild(el);
  }

  let baseReady = false;
  async function ensureBase() {
    if (baseReady && !WB.config.data.dev) return;
    injectStyle("base", await WB.tryRead("core/base.css"));
    injectStyle("ui", await WB.tryRead("core/ui.css"));
    baseReady = true;
  }

  /* ── 组件加载 ───────────────────────────────────────────── */
  async function load(id) {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) {
      throw new Error(`非法组件名 "${id}"（只允许小写字母、数字和连字符）`);
    }
    if (cache.has(id) && !WB.config.data.dev) return cache.get(id);

    const src = await WB.tryRead(`components/${id}/component.js`);
    if (src == null) {
      throw new Error(`找不到组件 "${id}" —— 期望文件 ${WB.root}/components/${id}/component.js`);
    }

    let comp;
    try {
      const factory = new Function(`"use strict"; return (${src});`)();
      if (typeof factory !== "function") {
        throw new Error("组件文件必须导出一个 (WB) => ({ meta, render }) 工厂函数");
      }
      comp = await factory(WB);
    } catch (e) {
      throw new Error(`组件 "${id}" 加载失败 — ${e.message}`);
    }
    if (!comp || typeof comp.render !== "function") {
      throw new Error(`组件 "${id}" 缺少 render() 方法`);
    }

    injectStyle(`c-${id}`, await WB.tryRead(`components/${id}/style.css`));
    cache.set(id, comp);
    return comp;
  }

  /* ── 参数合并 ───────────────────────────────────────────── */
  function mergeProps(meta, input) {
    const defs = (meta && meta.props) || {};
    const out = {};
    for (const [k, d] of Object.entries(defs)) out[k] = d && "default" in d ? d.default : undefined;
    for (const [k, v] of Object.entries(input || {})) {
      if (!RESERVED.has(k)) out[k] = v;
    }
    // color 类参数支持 "@accent" → var(--wb-accent)，跟着主题走
    for (const [k, d] of Object.entries(defs)) {
      if (d && d.type === "color") out[k] = WB.config.token(out[k]);
    }
    return out;
  }

  /* ── 共用 UI 片段 ───────────────────────────────────────── */
  const { h } = WB.dom;

  function empty(message, hint) {
    return h(
      "div.wb-empty",
      null,
      h("div.wb-empty-msg", { text: message || WB.i18n.t("empty.default") }),
      hint ? h("div.wb-empty-hint", { text: hint }) : null
    );
  }

  function errorCard(id, err) {
    return h(
      "div.wb-error",
      null,
      h("div.wb-error-title", { text: `${WB.i18n.t("err.title")} · ${id || WB.i18n.t("err.unknown")}` }),
      h("div.wb-error-msg", { text: String((err && err.message) || err) }),
      h("div.wb-error-hint", { text: WB.i18n.t("err.hint") })
    );
  }

  /* ── 挂载单个组件（看板里的块和独立调用都走这里）───────────
   * host 必须已经在某个 .wb 根元素内部，主题类挂在根上。 */
  async function mount(host, dv, input) {
    const id = input.c || input.component || "";
    try {
      if (WB.config.error) throw new Error(WB.config.error);
      if (!id) throw new Error(`没有指定组件。写法：dv.view("${WB.root}", { c: "组件名", ... })`);

      const comp = await load(id);
      const props = mergeProps(comp.meta, input);

      await comp.render({
        el: host,
        dv,
        app: dv.app,
        props,
        WB,
        h,
        frag: WB.dom.frag,
        link: WB.dom.link,
        t: WB.i18n.t,
        pick: WB.i18n.pick,
        i18n: WB.i18n,
        q: WB.query,
        ui: WB.ui,
        astro: WB.astro,
        cfg: WB.config,
        empty,
      });
    } catch (e) {
      console.error("[Workbench]", id, e);
      WB.dom.clear(host);
      host.appendChild(errorCard(id, e));
    }
  }

  /* ── 可用资源清单 ──────────────────────────────────────────
   * 一律走宿主接口。dataviewjs 模式下扫 vault 文件，插件模式下读打包
   * 进来的资源表 —— 内核这边不需要知道区别。 */
  const listComponents = () => WB.host.list("components");
  const listThemes = () => WB.host.list("themes");
  const listPresets = () => WB.host.list("presets");

  async function loadPreset(id) {
    const raw = await WB.tryRead(`presets/${id}.json`);
    if (raw == null) throw new Error(`找不到模板 "${id}"`);
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data.blocks)) throw new Error("模板里没有 blocks 数组");
      return data;
    } catch (e) {
      throw new Error(`模板 "${id}" 解析失败 — ${e.message}`);
    }
  }

  /* 布局算完之后把新坐标写回原对象，而不是替换数组元素 ——
   * 各处闭包都持有块对象的引用，换掉对象会让它们全部失效。 */
  function applyPositions(blocks, computed) {
    const map = new Map(computed.map((c) => [c.id, c]));
    for (const b of blocks) {
      const c = map.get(b.id);
      if (c) { b.x = c.x; b.y = c.y; b.w = c.w; b.h = c.h; }
    }
    return blocks;
  }

  /* ── 顶层入口 ───────────────────────────────────────────
   * 有 c → 单组件模式（可嵌进任何笔记）
   * 无 c → 看板模式（整页工作台，可编辑） */
  async function render(dv, input) {
    const single = !!(input.c || input.component);
    const theme = await WB.theme.canonical(WB.theme.resolve(input, dv), dv.app);

    await ensureBase();
    if (!single) injectStyle("board", await WB.tryRead("core/board.css"));
    await WB.theme.ensure(theme);

    const root = h(`div.wb.wb-theme-${theme}`, {
      dataset: { wbComponent: single ? input.c || input.component : "board" },
    });
    // config.tokens 走内联样式，天然压过主题里的类选择器
    for (const [k, v] of Object.entries(WB.config.data.tokens || {})) {
      root.style.setProperty(`--wb-${k}`, String(v));
    }
    dv.container.appendChild(root);

    if (single) return mount(root, dv, input);

    try {
      await WB.board.render(dv, input, root, theme);
    } catch (e) {
      console.error("[Workbench] board", e);
      WB.dom.clear(root);
      root.appendChild(errorCard("board", e));
    }
  }

  return {
    render, mount, load, injectStyle, mergeProps, empty, errorCard, cache,
    listComponents, listThemes, listPresets, loadPreset, applyPositions,
  };
}
