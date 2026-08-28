/* core/board.js · 栅格看板：布局算法 + 画布渲染 + 拖拽/缩放
 *
 * 布局模型和 gridstack 一致：12 列的虚拟栅格，块用 {x,y,w,h} 描述，
 * 有重力（空隙会自动上浮）。但这里是自己实现的 —— 组件库要能离线、
 * 免 CDN，不能引外部库。 */
(WB) => {
  const DEFAULT_BOARD = () => ({
    version: 1,
    theme: null,
    cols: 12,
    rowHeight: 34,
    gap: 10,
    blocks: [],
  });

  /* ── 布局数学 ───────────────────────────────────────────── */

  const overlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function clamp(b, cols) {
    b.w = Math.max(1, Math.min(cols, Math.round(b.w || 1)));
    b.h = Math.max(1, Math.round(b.h || 1));
    b.x = Math.max(0, Math.min(cols - b.w, Math.round(b.x || 0)));
    b.y = Math.max(0, Math.round(b.y || 0));
    return b;
  }

  /* 依次安置每个块。传入顺序即优先级 —— 正在拖的块排第一，不会被挤走。
   *
   * 必须「先下沉、再上浮」两步：只做上浮的话，一个从下面浮上来的块会
   * 停在 y=0，而后面那个本来就在 y=0 的块因为「已经到顶了」直接跳过检查，
   * 两个块就叠在一起了。下沉这一步专门堵这个洞。 */
  function compactOrdered(list, pinnedId) {
    const out = [];
    for (const b of list) {
      let y = b.y;
      // pinned 的那块原地不动：缩放时被改的块不该自己往上跑
      if (b.id !== pinnedId) {
        while (out.some((o) => overlap({ ...b, y }, o))) y++;          // 下沉到不撞人
        while (y > 0 && !out.some((o) => overlap({ ...b, y: y - 1 }, o))) y--; // 再尽量上浮
      }
      out.push({ ...b, y });
    }
    return out;
  }

  const byPos = (list) => list.slice().sort((a, b) => a.y - b.y || a.x - b.x);

  /* 不带优先级的整体重排：谁在上面谁先安置，位置基本不动。
   * 删除块、改高度这类操作用它 —— 用 place() 会让被改的块抢到最高优先级
   * 一路浮到顶，看起来像是自己乱跳。 */
  const relayout = (blocks) => compactOrdered(byPos(blocks));

  /* 从左上角开始找第一个放得下的空位。新组件因此会自动贴到已有内容
   * 旁边，而不是一律另起一行堆在最左边。 */
  function findSlot(blocks, w, h, cols) {
    const maxY = rowsOf(blocks) + 1;
    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x + w <= cols; x++) {
        if (!blocks.some((b) => overlap({ x, y, w, h }, b))) return { x, y };
      }
    }
    return { x: 0, y: maxY };
  }

  /* 把 moved 放到它的新位置，被它压住的块依次往下让，然后整体上浮。
   * 拖动用这个：被拖的块享有最高重力优先级，跟手才自然。 */
  function place(blocks, moved, cols) {
    clamp(moved, cols);
    return arrange(blocks, moved, cols, null);
  }

  /* 缩放专用：被改尺寸的块钉在原地，只让别人给它让路。
   *
   * 不能沿用 place()：那会让被改的块抢到最高重力优先级，一改大小就
   * 自己往上浮，用户看到的就是「我在拉大小，它却跑了」。
   * 宽度也只在右边界处截断，绝不反过来推 x —— 左边缘必须钉死。 */
  function resize(blocks, moved, cols) {
    moved.x = Math.max(0, Math.min(cols - 1, Math.round(moved.x || 0)));
    moved.y = Math.max(0, Math.round(moved.y || 0));
    moved.w = Math.max(1, Math.min(cols - moved.x, Math.round(moved.w || 1)));
    moved.h = Math.max(1, Math.round(moved.h || 1));
    return arrange(blocks, moved, cols, moved.id);
  }

  function arrange(blocks, moved, cols, pinnedId) {
    const result = [{ ...moved }];
    for (const o of byPos(blocks.filter((b) => b.id !== moved.id))) {
      const b = { ...o };
      while (result.some((r) => overlap(b, r))) b.y++;
      result.push(b);
    }
    return compactOrdered(result, pinnedId);
  }

  const rowsOf = (blocks) => blocks.reduce((m, b) => Math.max(m, b.y + b.h), 0);

  let uid = 0;
  const newId = () => `b${Date.now().toString(36)}${(uid++).toString(36)}`;

  /* ── 画布 ──────────────────────────────────────────────── */

  async function render(dv, input, root, theme) {
    const { h } = WB.dom;
    const app = dv.app;
    const name = WB.store.nameFor(dv, input);

    const data = Object.assign(DEFAULT_BOARD(), (await WB.store.load(app, name)) || {});
    data.blocks = (data.blocks || []).map((b) => clamp({ ...b }, data.cols));

    // 看板自己存的主题优先于 config.json（调用参数写死的除外）。
    // 在挂载任何块之前切换，所以不会闪一下错误配色。
    if (!input.theme && data.theme) {
      // 存档里可能写着中文名，先归一成 id
      data.theme = await WB.theme.canonical(data.theme, app);
    }
    if (!input.theme && data.theme && data.theme !== theme) {
      await WB.theme.ensure(data.theme);
      for (const c of [...root.classList]) {
        if (c.startsWith("wb-theme-")) root.classList.remove(c);
      }
      root.classList.add(`wb-theme-${data.theme}`);
      theme = data.theme;
    }

    const state = {
      dv, app, name, data, theme, root,
      editing: false,
      els: new Map(),   // blockId → { el, body }
      grid: null,
      ghost: null,
    };

    const wrap = h("div.wb-board");
    const toolbar = h("div.wb-tb");
    const grid = h("div.wb-grid");
    state.grid = grid;
    wrap.appendChild(toolbar);
    wrap.appendChild(grid);
    root.appendChild(wrap);

    /* ── 几何换算 ── */
    const geo = () => {
      const cols = data.cols;
      const gap = data.gap;
      const width = grid.clientWidth || root.clientWidth || 800;
      const colW = (width - gap * (cols - 1)) / cols;
      return { cols, gap, colW, rowH: data.rowHeight };
    };

    const boxOf = (b) => {
      const { gap, colW, rowH } = geo();
      return {
        left: b.x * (colW + gap),
        top: b.y * (rowH + gap),
        width: b.w * colW + (b.w - 1) * gap,
        height: b.h * rowH + (b.h - 1) * gap,
      };
    };
    state.geo = geo;
    state.boxOf = boxOf;

    function applyLayout(skipId) {
      const { gap, rowH } = geo();
      for (const b of data.blocks) {
        if (b.id === skipId) continue;
        const el = state.els.get(b.id)?.el;
        if (!el) continue;
        const box = boxOf(b);
        Object.assign(el.style, {
          left: `${box.left}px`,
          top: `${box.top}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
        });
      }
      const rows = rowsOf(data.blocks) + (state.editing ? 3 : 0);
      grid.style.height = `${Math.max(rows, 1) * (rowH + gap) - gap}px`;
      // 编辑态的栅格底纹要按当前行高画
      grid.style.setProperty("--wb-row", `${rowH}px`);
      grid.style.setProperty("--wb-gap-px", `${gap}px`);
    }
    state.applyLayout = applyLayout;

    const save = () => WB.store.save(app, name, data);
    state.save = save;

    /* ── 撤销历史 ──────────────────────────────────────────
     * 删除组件是不可逆操作，没有后悔药会让人不敢乱试。
     * 每次改动前压一份快照，最多留 20 步。 */
    state.history = [];
    state.snapshot = () => {
      state.history.push(JSON.stringify({ blocks: data.blocks, theme: data.theme }));
      if (state.history.length > 20) state.history.shift();
      if (state.onHistory) state.onHistory();
    };
    state.undo = async () => {
      const prev = state.history.pop();
      if (!prev) return false;
      const snap = JSON.parse(prev);

      // 组件集合可能变了（撤销一次删除/添加），最省事也最可靠的是整块重挂
      for (const [, rec] of state.els) rec.el.remove();
      state.els.clear();
      data.blocks = snap.blocks;
      data.theme = snap.theme;
      for (const b of data.blocks) await mountBlock(b);
      await renderEmptyHint();
      applyLayout();
      if (state.onHistory) state.onHistory();
      save();
      return true;
    };

    /* ── 单个块 ── */
    async function mountBlock(b) {
      const bar = h("div.wb-blk-bar", null,
        h("span.wb-blk-drag", { title: "拖动" }),
        h("span.wb-blk-name", { text: b.c }),
        h("span.wb-blk-sp"),
        h("button.wb-blk-btn", { title: "设置", text: "⚙", onclick: () => WB.editor.openProps(state, b) }),
        h("button.wb-blk-btn", { title: "删除", text: "✕", onclick: () => removeBlock(b.id) })
      );
      const body = h("div.wb-blk-body");
      const el = h("div.wb-blk", { dataset: { id: b.id } }, bar, body, h("div.wb-blk-resize", { title: "缩放" }));

      grid.appendChild(el);
      state.els.set(b.id, { el, body });

      await WB.runtime.mount(body, dv, { c: b.c, ...(b.props || {}) });
      WB.editor.wireBlock(state, b, el, bar);
      return el;
    }
    state.mountBlock = mountBlock;

    async function remountBlock(b) {
      const rec = state.els.get(b.id);
      if (!rec) return;
      WB.dom.clear(rec.body);
      await WB.runtime.mount(rec.body, dv, { c: b.c, ...(b.props || {}) });
    }
    state.remountBlock = remountBlock;

    async function removeBlock(id) {
      state.snapshot();
      const rec = state.els.get(id);
      if (rec) rec.el.remove();
      state.els.delete(id);
      data.blocks = data.blocks.filter((b) => b.id !== id);
      WB.runtime.applyPositions(data.blocks, relayout(data.blocks));
      applyLayout();
      await renderEmptyHint();
      save();
    }
    state.removeBlock = removeBlock;

    async function addBlock(componentId) {
      state.snapshot();
      const comp = await WB.runtime.load(componentId);
      const lay = (comp.meta && comp.meta.layout) || {};
      const w = Math.min(data.cols, lay.w || 6);
      const hh = lay.h || 5;
      const slot = findSlot(data.blocks, w, hh, data.cols);
      const b = clamp({ id: newId(), c: componentId, ...slot, w, h: hh, props: {} }, data.cols);
      data.blocks.push(b);
      await mountBlock(b);
      applyLayout();
      await renderEmptyHint();
      // 新块按实际内容高度收一次，避免默认高度切掉内容或留一大片空白
      fitHeight(b);
      save();
    }
    state.addBlock = addBlock;

    /* 量一下内容实际多高，把块高度调整到刚好装下 */
    function fitHeight(b) {
      const rec = state.els.get(b.id);
      if (!rec) return;
      const { gap, rowH } = geo();
      const barH = rec.el.querySelector(".wb-blk-bar")?.offsetHeight || 0;
      const need = rec.body.scrollHeight + barH + 8;
      const h2 = Math.max(2, Math.ceil((need + gap) / (rowH + gap)));
      if (h2 !== b.h) {
        b.h = h2;
        WB.runtime.applyPositions(data.blocks, relayout(data.blocks));
        applyLayout();
      }
    }
    state.fitHeight = fitHeight;

    /* ── 套用模板 ────────────────────────────────────────── */
    async function applyPreset(presetId) {
      state.snapshot();
      const preset = await WB.runtime.loadPreset(presetId);

      for (const [, rec] of state.els) rec.el.remove();
      state.els.clear();

      data.blocks = preset.blocks.map((b) =>
        clamp({
          id: newId(),
          c: b.c,
          x: b.x || 0, y: b.y || 0,
          w: b.w || 6, h: b.h || 5,
          props: b.props || {},
        }, data.cols)
      );
      // 模板坐标是手写的，难免有细微重叠 —— 统一过一遍布局算法兜住
      WB.runtime.applyPositions(data.blocks, relayout(data.blocks));

      for (const b of data.blocks) await mountBlock(b);
      await renderEmptyHint();
      applyLayout();
      if (preset.theme) await WB.editor.setTheme(state, preset.theme, { silent: true });
      // 模板里的高度是手写的估值，换个库、换套主题就不准了 —— 按实际内容收一遍
      for (const b of data.blocks) fitHeight(b);
      applyLayout();
      save();
    }
    state.applyPreset = applyPreset;

    /* ── 空看板引导 ──────────────────────────────────────── */
    let hint = null;
    async function renderEmptyHint() {
      if (hint) { hint.remove(); hint = null; }
      if (data.blocks.length) return;

      hint = h("div.wb-board-empty", null,
        h("div.wb-board-empty-msg", { text: "这个工作台还是空的" }),
        h("div.wb-board-empty-hint", { text: "选一个模板一键铺好，或点上面的「＋ 组件」自己搭" })
      );

      // 直接把模板摆出来，比让人先去找按钮快得多
      const cards = h("div.wb-preset-cards");
      for (const id of WB.runtime.listPresets(app)) {
        try {
          const p = await WB.runtime.loadPreset(id);
          const card = h("button.wb-preset-card", { type: "button" },
            h("div.wb-preset-name", { text: WB.i18n.pick(p.name) || id }),
            h("div.wb-preset-desc", { text: WB.i18n.pick(p.desc) || "" }),
            h("div.wb-preset-meta", { text: `${p.blocks.length} 个组件${p.theme ? " · " + p.theme : ""}` })
          );
          card.addEventListener("click", () => applyPreset(id));
          cards.appendChild(card);
        } catch (e) {
          console.warn(`[Workbench] 模板 ${id} 读取失败`, e);
        }
      }
      if (cards.childElementCount) hint.appendChild(cards);

      grid.appendChild(hint);
    }

    /* ── 挂载 ── */
    for (const b of data.blocks) await mountBlock(b);
    await renderEmptyHint();

    await WB.editor.buildToolbar(state, toolbar);
    state.setEditing(false);          // 默认只读，避免误拖
    applyLayout();

    // 容器宽度变了（侧栏开合、窗口缩放）要重算像素位置
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => applyLayout());
      ro.observe(grid);
    }
  }

  return {
    render, place, resize, compactOrdered, relayout, findSlot,
    overlap, clamp, rowsOf, byPos, newId, DEFAULT_BOARD,
  };
}
