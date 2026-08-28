/* core/store.js · 看板布局的持久化
 * 具体存到哪里由宿主决定：dataviewjs 模式下是 _wb/boards/*.json，
 * 插件模式下是插件自己的数据目录。内核只管序列化。 */
(WB) => {
  /* 笔记路径 → 看板名。同一篇笔记永远对应同一个布局文件。 */
  function nameFor(dv, input) {
    if (input && input.board) return slug(String(input.board));
    try {
      const p = dv.current().file.path;
      return slug(p.replace(/\.md$/, ""));
    } catch (e) {
      return "home";
    }
  }

  function slug(s) {
    return String(s)
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "home";
  }

  async function load(app, name) {
    try {
      const raw = await WB.host.boards.load(name);
      if (raw == null) return null;
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.blocks)) return data;
    } catch (e) {
      console.warn(`[Workbench] 布局 ${name} 解析失败，将使用空看板`, e);
    }
    return null;
  }

  const save = (app, name, data) => WB.host.boards.save(name, JSON.stringify(data, null, 2));

  return { load, save, nameFor, slug };
}
