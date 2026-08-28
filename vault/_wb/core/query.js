/* core/query.js · 数据访问层
 * 所有 Dataview 调用都收在这一个文件里。Dataview 已进入维护状态，
 * 将来换 Datacore / Bases 只需要重写本文件，组件一行不用动。 */
(WB) => {
  /* 把用户写的 source 归一成 Dataview 的 DQL source 字符串。
   *   ""            → 全库
   *   "@inbox"      → "00.raw"  （别名解析）
   *   "00.raw"      → "\"00.raw\""
   *   "#tag"        → 原样（已是合法 DQL）
   *   "\"a\" or \"b\"" → 原样 */
  function source(src) {
    if (src == null) return "";
    let s = WB.config.path(String(src).trim());
    if (s === "") return "";
    if (/^["'#(\[]/.test(s)) return s;
    if (/\s(and|or)\s/i.test(s)) return s;
    return `"${s}"`;
  }

  function pages(dv, src) {
    const dql = source(src);
    try {
      /* 按路径排序：Dataview 的返回顺序和插件版原生数据层的顺序不一定
         一致，而「今日精选」这类按下标取值的组件会因此推出不同的笔记。
         排一下，两套数据层的结果就能对齐 —— 用户从 dataviewjs 版换到
         插件版，首页应该长得一样。 */
      return dv.pages(dql).array().sort((a, b) => a.file.path.localeCompare(b.file.path));
    } catch (e) {
      throw new Error(`查询 ${dql || "(全库)"} 失败 — ${e.message}`);
    }
  }

  function count(dv, src) {
    return pages(dv, src).length;
  }

  /* file.ctime / file.mtime 是 luxon DateTime；统一转成原生 Date，
   * 这样组件的时间逻辑在浏览器预览器里也能跑。 */
  function timeOf(page, field) {
    const v = page && page.file && page.file[field === "mtime" ? "mtime" : "ctime"];
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toJSDate === "function") return v.toJSDate();
    if (typeof v.ts === "number") return new Date(v.ts);
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }

  /* 按天聚合成 { "2026-08-28": 3, ... }，热力图和趋势图都用它 */
  function tallyByDay(pages, field) {
    const out = {};
    for (const p of pages) {
      const d = timeOf(p, field);
      if (!d) continue;
      out[dayKey(d)] = (out[dayKey(d)] || 0) + 1;
    }
    return out;
  }

  function dayKey(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /* 取 frontmatter 字段，支持多个候选名（中英混用的库很常见） */
  function field(page, ...names) {
    for (const n of names) {
      const v = page && page[n];
      if (v != null && v !== "") return v;
    }
    return null;
  }

  /* 取任务。Dataview 的 page.file.tasks 已经带好了 path/line/text/completed。 */
  function tasks(dv, src, opts) {
    const o = opts || {};
    const out = [];
    for (const p of pages(dv, src)) {
      const list = p.file && p.file.tasks;
      if (!list) continue;
      for (const t of list.array ? list.array() : list) {
        if (!o.showDone && t.completed) continue;
        if (o.onlyDone && !t.completed) continue;
        out.push(t);
      }
    }
    return out;
  }

  /* 借用 Dataview 自己的渲染器（dv.taskList / dv.list / dv.table）。
   * 它们只会往 dv.container 里写，所以临时把 container 换成我们的元素。
   * 这样能白拿 Dataview 的交互式待办勾选（含正确的回写文件），
   * 比自己改用户笔记的某一行安全得多。 */
  async function renderWith(dv, el, fn) {
    const saved = dv.container;
    try {
      dv.container = el;
      await fn();
    } finally {
      dv.container = saved;
    }
  }

  /* 某个文件夹下的直接子文件夹（用于自动分类统计） */
  function subfolders(app, folder) {
    const base = WB.config.path(folder || "");
    const set = new Set();
    const prefix = base ? base.replace(/\/$/, "") + "/" : "";
    for (const f of app.vault.getFiles()) {
      if (!f.path.startsWith(prefix) || !f.path.endsWith(".md")) continue;
      const rest = f.path.slice(prefix.length);
      const i = rest.indexOf("/");
      if (i > 0) set.add(rest.slice(0, i));
    }
    return [...set].sort();
  }

  /* 任务渲染。这一版直接借 Dataview 的 taskList —— 勾选要回写到原笔记
   * 的具体某一行，自己实现一旦行号错位就会改坏用户的笔记，不值得冒这个险。
   * 原生版（query-native.js）没有这个依赖，只能自己画并自己回写，那边
   * 额外做了「写之前核对原行内容」的保护。 */
  function renderTasks(ctx, el, list, opts) {
    const groupByFile = !!(opts && opts.groupByFile);
    return renderWith(ctx.dv, el, () => ctx.dv.taskList(list, groupByFile, el));
  }

  return {
    source, pages, count, timeOf, tallyByDay, dayKey, field,
    tasks, renderWith, renderTasks, subfolders,
  };
}
