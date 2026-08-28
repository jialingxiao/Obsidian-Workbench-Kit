/* core/query-native.js · 数据访问层（不依赖 Dataview）
 *
 * 和 core/query.js 暴露完全相同的接口，只是数据从 Obsidian 自己的
 * metadataCache 来。插件模式加载这一份，dataviewjs 模式加载那一份，
 * 组件两边都不用改 —— 这正是当初把所有查询收在一个文件里的目的。
 *
 * 三个性能上的取舍：
 * 1. 页面列表带缓存，靠 metadataCache 的变更事件失效。组件渲染一次
 *    会调好几次 pages()，每次全量扫一遍库在大库上是灾难。
 * 2. 反链索引从 resolvedLinks 反转一次得到，不逐文件查。
 * 3. 任务需要正文（metadataCache 只给行号不给文本），但只读那些
 *    确实含 checkbox 的文件 —— 缓存里就能判断，不必全库读盘。
 */
(WB) => {
  const app = () => WB.app;

  let pageCache = null;
  let taskIndex = new Map();   // path → [{text, completed, line, path}]
  let backlinks = null;

  function invalidate() {
    pageCache = null;
    backlinks = null;
  }

  /* ── 反链索引 ── */
  function buildBacklinks() {
    if (backlinks) return backlinks;
    backlinks = new Map();
    const resolved = app().metadataCache.resolvedLinks || {};
    for (const [from, targets] of Object.entries(resolved)) {
      for (const to of Object.keys(targets)) {
        if (!backlinks.has(to)) backlinks.set(to, []);
        backlinks.get(to).push({ path: from });
      }
    }
    return backlinks;
  }

  /* ── 标签：行内 #tag 和 frontmatter tags 合并，统一带 # ── */
  function tagsOf(cache) {
    const out = new Set();
    for (const t of cache?.tags || []) if (t.tag) out.add(String(t.tag));
    const fm = cache?.frontmatter || {};
    const raw = fm.tags ?? fm.tag;
    const push = (v) => {
      const s = String(v).trim();
      if (s) out.add(s.startsWith("#") ? s : "#" + s);
    };
    if (Array.isArray(raw)) raw.forEach(push);
    else if (typeof raw === "string") raw.split(/[,\s]+/).forEach(push);
    return [...out];
  }

  /* ── 页面列表 ── */
  function allPages() {
    if (pageCache) return pageCache;
    const a = app();
    const back = buildBacklinks();
    pageCache = a.vault.getMarkdownFiles().map((f) => {
      const cache = a.metadataCache.getFileCache(f) || {};
      const page = {
        ...(cache.frontmatter || {}),
        file: {
          path: f.path,
          name: f.basename,
          folder: f.parent ? f.parent.path : "",
          ctime: new Date(f.stat.ctime),
          mtime: new Date(f.stat.mtime),
          size: f.stat.size,
          tags: tagsOf(cache),
          inlinks: back.get(f.path) || [],
          outlinks: (cache.links || []).map((l) => ({ path: l.link })),
          tasks: taskIndex.get(f.path) || [],
        },
      };
      return page;
    });
    /* 按路径排序，给出确定的页面顺序。
       getMarkdownFiles() 的顺序不保证稳定，而「今日精选」这类按下标取值的
       组件依赖它 —— 不排序的话同一天重启 Obsidian 就可能推出不同的笔记。 */
    pageCache.sort((a, b) => a.file.path.localeCompare(b.file.path));
    return pageCache;
  }

  /* ── source 解析 ──
   * DQL 那套语法这里只支持最常用的三种：文件夹、#标签、留空全库。
   * 复杂查询是 Dataview 的地盘，插件版不打算复刻整套查询语言。 */
  function source(src) {
    if (src == null) return "";
    let s = WB.config.path(String(src).trim());
    return s.replace(/^["']|["']$/g, "");
  }

  /* 约定：pages() 返回的数组归调用方所有，可以随便排序、增删。
   * 所以全库这条路径必须 slice() 一份 —— 直接把缓存数组交出去的话，
   * 组件里一句 pages.sort() 就把缓存的顺序改了，后面所有按下标取值的
   * 组件（今日精选、待办）全跟着错位。Dataview 的 .array() 每次都返回
   * 新数组，所以这个坑只有换到原生层才会踩到。 */
  function pages(_dv, src) {
    const s = source(src);
    if (!s) return allPages().slice();
    if (s.startsWith("#")) {
      const want = s.toLowerCase();
      return allPages().filter((p) =>
        p.file.tags.some((t) => t.toLowerCase() === want || t.toLowerCase().startsWith(want + "/"))
      );
    }
    const prefix = s.replace(/\/$/, "") + "/";
    return allPages().filter((p) => p.file.path.startsWith(prefix));
  }

  const count = (dv, src) => pages(dv, src).length;

  function timeOf(page, field) {
    const v = page?.file?.[field === "mtime" ? "mtime" : "ctime"];
    return v instanceof Date ? v : v ? new Date(v) : null;
  }

  function dayKey(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function tallyByDay(list, field) {
    const out = {};
    for (const p of list) {
      const d = timeOf(p, field);
      if (!d) continue;
      out[dayKey(d)] = (out[dayKey(d)] || 0) + 1;
    }
    return out;
  }

  function field(page, ...names) {
    for (const n of names) {
      const v = page?.[n];
      if (v != null && v !== "") return v;
    }
    return null;
  }

  function tasks(dv, src, opts) {
    const o = opts || {};
    const out = [];
    for (const p of pages(dv, src)) {
      for (const t of p.file.tasks) {
        if (!o.showDone && t.completed) continue;
        if (o.onlyDone && !t.completed) continue;
        out.push(t);
      }
    }
    return out;
  }

  function subfolders(a, folder) {
    const base = WB.config.path(folder || "");
    const set = new Set();
    const prefix = base ? base.replace(/\/$/, "") + "/" : "";
    for (const f of a.vault.getFiles()) {
      if (!f.path.startsWith(prefix) || !f.path.endsWith(".md")) continue;
      const rest = f.path.slice(prefix.length);
      const i = rest.indexOf("/");
      if (i > 0) set.add(rest.slice(0, i));
    }
    return [...set].sort();
  }

  /* ── 任务索引 ──
   * metadataCache 的 listItems 给了行号和完成状态，但没有文本，所以还是
   * 得读正文。好在缓存能先告诉我们哪些文件根本没有 checkbox —— 大库里
   * 这一步能省掉绝大部分读盘。 */
  async function reindex() {
    const a = app();
    const next = new Map();
    for (const f of a.vault.getMarkdownFiles()) {
      const cache = a.metadataCache.getFileCache(f);
      const items = (cache?.listItems || []).filter((it) => typeof it.task === "string");
      if (!items.length) continue;
      let lines;
      try {
        lines = (await a.vault.cachedRead(f)).split("\n");
      } catch (e) {
        continue;
      }
      const list = [];
      for (const it of items) {
        const line = it.position.start.line;
        const raw = lines[line];
        if (raw == null) continue;
        list.push({
          text: raw.replace(/^\s*[-*+]\s*\[.\]\s*/, "").trim(),
          completed: it.task !== " ",
          line,
          path: f.path,
          raw,
        });
      }
      if (list.length) next.set(f.path, list);
    }
    taskIndex = next;
    invalidate();
    return taskIndex.size;
  }

  /* ── 勾选回写 ──
   * 改用户笔记的具体某一行是危险操作：行号可能因为别处的编辑而错位。
   * 所以写之前先核对那一行还是不是我们记下的内容，对不上就放弃并重建
   * 索引 —— 宁可这次点击没生效，也不能改坏别的行。 */
  async function toggleTask(task) {
    const a = app();
    const f = a.vault.getAbstractFileByPath(task.path);
    if (!f) return false;
    const text = await a.vault.read(f);
    const lines = text.split("\n");
    const cur = lines[task.line];

    if (cur == null || cur !== task.raw) {
      console.warn("[Workbench] 任务所在行已变化，已放弃写入并重建索引", task.path, task.line);
      await reindex();
      return false;
    }

    const flipped = task.completed
      ? cur.replace(/\[[xX]\]/, "[ ]")
      : cur.replace(/\[ \]/, "[x]");
    if (flipped === cur) return false;

    lines[task.line] = flipped;
    await a.vault.modify(f, lines.join("\n"));
    task.completed = !task.completed;
    task.raw = flipped;
    return true;
  }

  /* ── 任务渲染 ──
   * Dataview 版把这件事交给 dv.taskList，这里得自己画，勾选也自己回写。 */
  function renderTasks(ctx, el, list, opts) {
    const { h } = WB.dom;
    const o = opts || {};
    const groups = new Map();
    for (const t of list) {
      const k = o.groupByFile ? t.path : "";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t);
    }

    for (const [path, items] of groups) {
      if (path) {
        const name = path.split("/").pop().replace(/\.md$/, "");
        const head = WB.dom.link(path, name);
        head.classList.add("wb-tasks-file");
        el.appendChild(head);
      }
      const ul = h("ul.contains-task-list");
      for (const t of items) {
        const box = h("input.task-list-item-checkbox", { type: "checkbox" });
        box.checked = !!t.completed;
        const li = h("li.task-list-item", { dataset: { task: t.completed ? "x" : " " } },
          box, h("span.wb-task-text", { text: t.text }));
        box.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          box.disabled = true;
          const ok = await toggleTask(t);
          box.disabled = false;
          box.checked = !!t.completed;
          li.dataset.task = t.completed ? "x" : " ";
          if (!ok) box.checked = !!t.completed;
        });
        ul.appendChild(li);
      }
      el.appendChild(ul);
    }
  }

  /* Dataview 版里这是「临时把 dv.container 换掉」的技巧，原生版不需要，
   * 但接口得留着，否则组件两边不通用。 */
  const renderWith = async (_dv, _el, fn) => fn();

  return {
    source, pages, count, timeOf, tallyByDay, dayKey, field,
    tasks, subfolders, renderWith, renderTasks,
    reindex, invalidate, toggleTask,
    get taskCount() { return [...taskIndex.values()].reduce((n, l) => n + l.length, 0); },
  };
}
