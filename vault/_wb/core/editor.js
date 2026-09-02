/* core/editor.js · 工具栏、拖拽/缩放交互、组件面板、参数表单
 *
 * 拖拽只在「编辑」开启时生效。默认只读是刻意的：首页天天要点里面的
 * 链接，随手一拖就把布局改了会很烦人。 */
(WB) => {
  const { h } = WB.dom;

  /* ── 小工具：点外面就关掉的浮层 ── */
  function popover(anchor, content, cls) {
    const pop = h(`div.wb-pop${cls ? "." + cls : ""}`, null, content);
    document.body.appendChild(pop);

    /* 定位：默认贴在按钮下方；下方装不下就翻到上方；再放不下就贴着
     * 视口边缘并压缩高度。 */
    const margin = 8;
    const gap = 6;
    let lastWanted = -1;

    const place = () => {
      // 先解开高度限制再量，否则量到的是上一次夹过的值而不是内容真实高度
      const prevMax = pop.style.maxHeight;
      pop.style.maxHeight = "none";
      const wanted = pop.offsetHeight;
      if (wanted === lastWanted) { pop.style.maxHeight = prevMax; return; }
      lastWanted = wanted;

      const r = anchor.getBoundingClientRect();
      const vh = window.innerHeight;
      const below = vh - r.bottom - gap - margin;
      const above = r.top - gap - margin;

      let maxH, top;
      if (wanted <= below || below >= above) {
        maxH = below;
        top = r.bottom + gap;
      } else {
        maxH = above;
        top = r.top - gap - Math.min(wanted, above);
      }
      maxH = Math.max(120, Math.min(maxH, vh - margin * 2));
      pop.style.maxHeight = `${maxH}px`;

      // 高度定下来之后再夹一次位置，保证整块都在屏幕里
      const finalH = Math.min(pop.offsetHeight, maxH);
      pop.style.top = `${Math.max(margin, Math.min(top, vh - finalH - margin))}px`;
      pop.style.left = `${Math.max(margin, Math.min(r.left, window.innerWidth - pop.offsetWidth - margin))}px`;
    };
    place();

    /* 面板内容是异步填进来的（要逐个读组件/主题的 meta），首次定位时
     * 里面还是空的 —— 量到几十像素就判定「下方放得下」，等内容填满就
     * 撑出屏幕了。所以内容填完必须再定位一次。
     *
     * ResizeObserver 只当兜底，不当主路径：它的回调要等一帧渲染才派发，
     * 窗口最小化、面板隐藏这些不合成帧的场景下根本不触发。 */
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => place());
      ro.observe(content);
    }

    const close = (e) => {
      if (e && (pop.contains(e.target) || anchor.contains(e.target))) return;
      if (ro) ro.disconnect();
      pop.remove();
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", onKey, true);
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    setTimeout(() => {
      document.addEventListener("pointerdown", close, true);
      document.addEventListener("keydown", onKey, true);
    }, 0);
    return { el: pop, close: () => close(), reposition: place };
  }

  /* ── 工具栏 ─────────────────────────────────────────────── */
  async function buildToolbar(state, bar) {
    const status = h("span.wb-tb-status");
    let statusTimer = null;
    const flash = (text) => {
      status.textContent = text;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => (status.textContent = ""), 1600);
    };
    state.flash = flash;

    const origSave = state.save;
    state.save = async () => {
      const ok = await origSave();
      flash(ok ? "已保存" : "保存失败");
      return ok;
    };

    // ＋ 组件
    const addBtn = h("button.wb-tb-btn", { text: "＋ 组件" });
    addBtn.addEventListener("click", () => openAddPanel(state, addBtn));

    // 模板
    const presetBtn = h("button.wb-tb-btn", { text: "⚡ 模板" });
    presetBtn.addEventListener("click", () => openPresetMenu(state, presetBtn));

    // 撤销
    const undoBtn = h("button.wb-tb-btn", { text: "↩ 撤销" });
    undoBtn.addEventListener("click", async () => {
      if (await state.undo()) flash("已撤销");
    });
    state.onHistory = () => { undoBtn.disabled = !state.history.length; };

    // 主题
    const themeBtn = h("button.wb-tb-btn", { text: "🎨 主题" });
    themeBtn.addEventListener("click", () => openThemeMenu(state, themeBtn));

    // 编辑开关
    const editBtn = h("button.wb-tb-btn.wb-tb-toggle", { text: "✏️ 编辑" });
    state.setEditing = (on) => {
      state.editing = on;
      editBtn.classList.toggle("is-on", on);
      state.root.classList.toggle("is-editing", on);
      // 只读态下这三个都用不上，藏起来让工具栏保持干净
      for (const b of [addBtn, presetBtn, undoBtn]) b.classList.toggle("is-hidden", !on);
      state.onHistory();
      state.applyLayout();
    };
    editBtn.addEventListener("click", () => state.setEditing(!state.editing));

    bar.appendChild(addBtn);
    bar.appendChild(presetBtn);
    bar.appendChild(undoBtn);
    bar.appendChild(themeBtn);
    bar.appendChild(h("span.wb-tb-sp"));
    bar.appendChild(status);
    bar.appendChild(editBtn);
  }

  /* ── 模板菜单 ───────────────────────────────────────────
   * 套模板会整块替换现有布局，所以非空看板要二次确认。 */
  async function openPresetMenu(state, anchor) {
    const list = h("div.wb-menu.wb-preset-menu");
    const pop = popover(anchor, list, "wb-pop-preset");

    const ids = WB.runtime.listPresets(state.app);
    if (!ids.length) {
      list.appendChild(h("div.wb-pick-empty", { text: "没找到任何模板" }));
      return;
    }

    for (const id of ids) {
      let p;
      try {
        p = await WB.runtime.loadPreset(id);
      } catch (e) {
        continue;
      }
      const card = h("button.wb-preset-card", { type: "button" },
        h("div.wb-preset-name", { text: WB.i18n.pick(p.name) || id }),
        h("div.wb-preset-desc", { text: WB.i18n.pick(p.desc) || "" }),
        h("div.wb-preset-meta", { text: `${p.blocks.length} 个组件${p.theme ? " · " + p.theme : ""}` })
      );

      let armed = false;
      card.addEventListener("click", async () => {
        if (state.data.blocks.length && !armed) {
          armed = true;
          card.classList.add("is-armed");
          card.querySelector(".wb-preset-meta").textContent = "会替换当前布局 · 再点一次确认（可撤销）";
          return;
        }
        pop.close();
        await state.applyPreset(id);
      });
      list.appendChild(card);
    }
    pop.reposition();
  }

  /* ── 组件选择面板：按分类分组 + 搜索 ─────────────────────── */
  async function openAddPanel(state, anchor) {
    const search = h("input.wb-pick-search", { type: "text", placeholder: "搜索组件…" });
    const listBox = h("div.wb-pick");
    const wrap = h("div.wb-pick-wrap", null, search, listBox);
    const pop = popover(anchor, wrap, "wb-pop-pick");
    search.focus();

    // 先把所有组件的 meta 读出来，坏掉的直接跳过
    const entries = [];
    for (const id of WB.runtime.listComponents(state.app)) {
      try {
        const meta = (await WB.runtime.load(id)).meta || {};
        entries.push({
          id,
          group: meta.group || "other",
          name: WB.i18n.pick(meta.name) || id,
          desc: WB.i18n.pick(meta.desc) || "",
          keywords: [id, WB.i18n.pick(meta.name), WB.i18n.pick(meta.desc)].join(" ").toLowerCase(),
        });
      } catch (e) {
        console.warn(`[Workbench] 组件 ${id} 无法载入，已从面板隐藏`, e);
      }
    }

    // 已知分类按 GROUPS 的顺序排，未归类的兜底到最后
    const order = WB.ui.GROUPS.map((g) => g.id);
    const groupsOf = (list) => {
      const seen = [...new Set(list.map((e) => e.group))];
      return seen.sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
    };

    const paint = () => {
      const q = search.value.trim().toLowerCase();
      const hits = q ? entries.filter((e) => e.keywords.includes(q)) : entries;
      WB.dom.clear(listBox);

      if (!hits.length) {
        listBox.appendChild(h("div.wb-pick-empty", { text: q ? "没有匹配的组件" : "没找到任何组件" }));
        return;
      }

      for (const g of groupsOf(hits)) {
        const inGroup = hits.filter((e) => e.group === g);
        listBox.appendChild(
          h("div.wb-pick-group", null,
            h("span", { text: WB.ui.groupName(g) }),
            h("span.wb-pick-count", { text: String(inGroup.length) })
          )
        );
        for (const e of inGroup) {
          const item = h("button.wb-pick-item", null,
            h("div.wb-pick-name", { text: e.name }),
            h("div.wb-pick-desc", { text: e.desc }),
            h("div.wb-pick-id", { text: e.id })
          );
          item.addEventListener("click", async () => {
            pop.close();
            await state.addBlock(e.id);
          });
          listBox.appendChild(item);
        }
      }
    };

    search.addEventListener("input", () => { paint(); pop.reposition(); });
    // 搜到唯一一个时回车直接添加
    search.addEventListener("keydown", async (ev) => {
      if (ev.key !== "Enter") return;
      const first = listBox.querySelector(".wb-pick-item");
      if (first) first.click();
    });
    paint();
    pop.reposition();
  }

  /* ── 主题菜单 ─────────────────────────────────────────────
   * 配色样本直接用主题自己声明的三色，比一句文字描述更快让人选中。 */
  async function openThemeMenu(state, anchor) {
    const list = h("div.wb-menu.wb-theme-menu");
    const pop = popover(anchor, list, "wb-pop-theme");

    for (const id of WB.runtime.listThemes(state.app)) {
      const info = await WB.theme.meta(id);

      const swatch = h("span.wb-sw");
      for (const c of info.swatch.length ? info.swatch : ["#888", "#eee", "#444"]) {
        swatch.appendChild(h("span.wb-sw-c", { style: { background: c } }));
      }

      const item = h("button.wb-theme-item", { class: id === state.theme ? "is-on" : "" },
        swatch,
        h("span.wb-theme-txt", null,
          h("span.wb-theme-name", { text: info.name }),
          h("span.wb-theme-desc", { text: info.desc }),
          info.font ? h("span.wb-theme-font", { text: info.font }) : null
        )
      );
      item.addEventListener("click", async () => {
        pop.close();
        await setTheme(state, id);
      });
      list.appendChild(item);
    }
    pop.reposition();
  }

  /* opts.silent：不压撤销快照。套模板时会顺带换主题，如果那次也记一步，
   * 撤销就只退掉主题、退不回布局 —— 用户点一次「撤销」什么也没变。 */
  async function setTheme(state, rawName, opts) {
    if (!opts || !opts.silent) state.snapshot();
    // 传进来的可能是中文名（模板里写的就是「朱砂」），先归一成 id ——
    // CSS 类是 .wb-theme-zhusha，挂成 .wb-theme-朱砂 就谁也匹配不上了
    const name = await WB.theme.canonical(rawName, state.app);
    await WB.theme.ensure(name);
    for (const c of [...state.root.classList]) {
      if (c.startsWith("wb-theme-")) state.root.classList.remove(c);
    }
    state.root.classList.add(`wb-theme-${name}`);
    state.theme = name;
    state.data.theme = name;
    // 有些组件在渲染时读了主题色，重挂一遍最稳妥
    for (const b of state.data.blocks) await state.remountBlock(b);
    state.applyLayout();
    state.save();
  }

  /* ── 参数表单（由 meta.props 自动生成）───────────────────── */
  async function openProps(state, block) {
    const comp = await WB.runtime.load(block.c);
    const defs = (comp.meta && comp.meta.props) || {};
    const anchor = state.els.get(block.id).el.querySelector(".wb-blk-bar");

    const form = h("div.wb-form");
    form.appendChild(h("div.wb-form-title", { text: WB.i18n.pick(comp.meta.name) || block.c }));

    let timer = null;
    const apply = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await state.remountBlock(block);
        state.save();
      }, 350);
    };

    const cur = (key) => (block.props && block.props[key] !== undefined ? block.props[key] : defs[key].default);

    // 一次开面板只压一份快照：否则每敲一个字符都进历史，撤销就没法用了
    let snapped = false;
    const set = (key, v) => {
      if (!snapped) { state.snapshot(); snapped = true; }
      block.props = block.props || {};
      if (v === undefined) delete block.props[key];
      else block.props[key] = v;
      apply();
    };

    for (const [key, def] of Object.entries(defs)) {
      const row = h("label.wb-form-row");
      row.appendChild(h("div.wb-form-label", { text: key }));

      const type = def.type || "text";
      let field;

      if (type === "bool") {
        field = h("input.wb-form-check", { type: "checkbox" });
        field.checked = !!cur(key);
        field.addEventListener("change", () => set(key, field.checked));
      } else if (type === "enum") {
        field = h("select.wb-form-input");
        for (const o of def.options || []) {
          const opt = h("option", { value: o, text: o });
          if (String(cur(key)) === String(o)) opt.selected = true;
          field.appendChild(opt);
        }
        field.addEventListener("change", () => set(key, field.value));
      } else if (type === "number") {
        field = h("input.wb-form-input", { type: "number", value: cur(key) ?? "" });
        field.addEventListener("change", () => set(key, field.value === "" ? undefined : Number(field.value)));
      } else if (type === "array" || type === "object") {
        // 结构化参数没法用简单控件表达，给个 JSON 框，格式错了当场提示
        field = h("textarea.wb-form-input.wb-form-json", { rows: 6 });
        field.value = JSON.stringify(cur(key) ?? (type === "array" ? [] : {}), null, 2);
        const err = h("div.wb-form-err");
        field.addEventListener("input", () => {
          try {
            set(key, JSON.parse(field.value));
            err.textContent = "";
            field.classList.remove("is-bad");
          } catch (e) {
            err.textContent = "JSON 格式有误";
            field.classList.add("is-bad");
          }
        });
        row.appendChild(field);
        row.appendChild(err);
        if (def.desc) row.appendChild(h("div.wb-form-desc", { text: def.desc }));
        form.appendChild(row);
        continue;
      } else {
        field = h("input.wb-form-input", { type: "text", value: cur(key) ?? "" });
        field.addEventListener("input", () => set(key, field.value));
      }

      row.appendChild(field);
      if (def.desc) row.appendChild(h("div.wb-form-desc", { text: def.desc }));
      form.appendChild(row);
    }

    if (!Object.keys(defs).length) {
      form.appendChild(h("div.wb-form-desc", { text: "这个组件没有可调参数" }));
    }
    popover(anchor, form, "wb-pop-form");
  }

  /* ── 拖拽与缩放 ─────────────────────────────────────────── */
  function wireBlock(state, block, el, bar) {
    bar.addEventListener("pointerdown", (ev) => {
      if (!state.editing) return;
      if (ev.target.closest(".wb-blk-btn")) return; // 让按钮正常点击
      startDrag(state, block, el, ev);
    });
    el.querySelector(".wb-blk-resize").addEventListener("pointerdown", (ev) => {
      if (!state.editing) return;
      startResize(state, block, el, ev);
    });
  }

  function makeGhost(state) {
    const g = h("div.wb-ghost");
    state.grid.appendChild(g);
    return g;
  }

  function moveGhost(state, ghost, b) {
    const box = state.boxOf(b);
    Object.assign(ghost.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
  }

  /* ── 拖动与缩放 ──────────────────────────────────────────
   *
   * 三条规矩，缺一个就会「不跟手」：
   *
   * 1. 被操作的那个块永远排除在 applyLayout 之外，由这里直接写像素值。
   *    交给 applyLayout 的话它会被写成整格数值 —— 于是块是一格一格跳的。
   *    以前拖动做对了（applyLayout(block.id)），缩放漏了 skipId，所以
   *    缩放手感明显比拖动差一截。
   *
   * 2. 只有落点格子真的变了才重跑布局算法。指针在同一格里移动时，
   *    别人不需要让位。以前每个 pointermove 都跑一遍完整的碰撞检测加
   *    两步压紧，高刷屏上一秒一百多次，还把其他块 160ms 的过渡动画
   *    反复打断重启，整体就发黏。
   *
   * 3. pointermove 用 rAF 归并。浏览器一帧内可能给好几个事件，
   *    没必要一帧算好几遍。
   */

  /* 把一串 pointermove 压成每帧最多一次 */
  function rafThrottle(fn) {
    let pending = null, id = 0;
    const run = () => { id = 0; if (pending) fn(pending); };
    const push = (e) => {
      pending = { clientX: e.clientX, clientY: e.clientY };
      if (!id) id = requestAnimationFrame(run);
    };
    push.cancel = () => { if (id) cancelAnimationFrame(id); id = 0; pending = null; };
    return push;
  }

  function startDrag(state, block, el, ev) {
    ev.preventDefault();
    // 捕获指针：移出元素、越过别的块时事件也不会丢
    try { ev.target.setPointerCapture(ev.pointerId); } catch (e) {}
    state.snapshot();
    const snapshot = state.data.blocks.map((b) => ({ ...b }));
    const startBox = state.boxOf(block);
    const px = ev.clientX, py = ev.clientY;

    el.classList.add("is-dragging");
    const ghost = makeGhost(state);
    moveGhost(state, ghost, block);

    // 记住上一次的落点格子，没变就不重排
    let lastX = block.x, lastY = block.y;

    const onMove = rafThrottle((e) => {
      const g = state.geo();
      const dx = e.clientX - px, dy = e.clientY - py;

      /* 跟手用 transform 而不是改 left/top：translate 走合成，不触发
         重排；改 left/top 每帧都要让浏览器重新算一遍布局。 */
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      const nx = Math.round((startBox.left + dx) / (g.colW + g.gap));
      const ny = Math.round((startBox.top + dy) / (g.rowH + g.gap));
      if (nx === lastX && ny === lastY) return;   // 还在同一格，别人不用动
      lastX = nx; lastY = ny;

      const moved = { ...block, x: nx, y: ny };
      WB.runtime.applyPositions(state.data.blocks, WB.board.place(snapshot, moved, g.cols));
      moveGhost(state, ghost, block);
      state.applyLayout(block.id);               // 跳过自己，保持跟手
    });

    const onUp = () => {
      onMove.cancel();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      try { ev.target.releasePointerCapture(ev.pointerId); } catch (err) {}
      el.classList.remove("is-dragging");
      el.style.transform = "";                   // 落格由 applyLayout 接手
      ghost.remove();
      state.applyLayout();
      state.save();
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  function startResize(state, block, el, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    try { ev.target.setPointerCapture(ev.pointerId); } catch (e) {}
    state.snapshot();
    const snapshot = state.data.blocks.map((b) => ({ ...b }));
    const startBox = state.boxOf(block);
    const px = ev.clientX, py = ev.clientY;
    const w0 = block.w, h0 = block.h;

    el.classList.add("is-resizing");
    const ghost = makeGhost(state);
    moveGhost(state, ghost, block);

    let lastW = w0, lastH = h0;

    const onMove = rafThrottle((e) => {
      const g = state.geo();
      const dx = e.clientX - px, dy = e.clientY - py;

      /* 尺寸没法用 transform（scale 会把内容一起拉变形），只能写像素。
         但只写这一个元素，代价可以接受；关键是别让 applyLayout 把它
         改回整格。 */
      const maxW = (g.cols - block.x) * (g.colW + g.gap) - g.gap;
      el.style.width = `${Math.max(g.colW, Math.min(maxW, startBox.width + dx))}px`;
      el.style.height = `${Math.max(g.rowH * 2 + g.gap, startBox.height + dy)}px`;

      const nw = Math.max(1, Math.min(g.cols - block.x,
                          Math.round(w0 + dx / (g.colW + g.gap))));
      const nh = Math.max(2, Math.round(h0 + dy / (g.rowH + g.gap)));
      if (nw === lastW && nh === lastH) return;
      lastW = nw; lastH = nh;

      // 用 resize() 而不是 place()：被改尺寸的块要钉在原地，只让别人让路
      const moved = { ...block, w: nw, h: nh };
      WB.runtime.applyPositions(state.data.blocks, WB.board.resize(snapshot, moved, g.cols));
      moveGhost(state, ghost, block);
      state.applyLayout(block.id);               // 同样要跳过自己
    });

    const onUp = () => {
      onMove.cancel();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      try { ev.target.releasePointerCapture(ev.pointerId); } catch (err) {}
      el.classList.remove("is-resizing");
      ghost.remove();
      state.applyLayout();
      state.save();
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  return { buildToolbar, wireBlock, openProps, openAddPanel, openThemeMenu, setTheme, popover };
}
