/* 组件 · quote 每日一句
 * 句子来源二选一：直接写在参数里，或指向库里一篇笔记（每个列表项一句）。
 * 用笔记当来源更好用 —— 摘抄时顺手加一行就行，不用回来改组件参数。 */
(WB) => {
  const hashOf = (s) => {
    let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return n;
  };

  /* 从 markdown 里抽列表项：- 引文 —— 出处 */
  function parseNote(md) {
    return String(md || "")
      .split("\n")
      .map((l) => l.replace(/^\s*[-*+]\s+/, "").trim())
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("---"))
      .map((l) => {
        const m = l.split(/\s+[—–]{1,2}\s+|\s+--\s+/);
        return m.length > 1 ? { text: m[0], from: m.slice(1).join(" ") } : { text: l };
      });
  }

  return {
    meta: {
      id: "quote",
      group: "header",
      name: { zh: "每日一句", en: "Quote" },
      desc: { zh: "每天一句摘抄，来自参数或库里的一篇笔记", en: "A daily quote from props or a note in your vault" },
      props: {
        note:  { type: "path",  default: "",      desc: "句子来源笔记，每个列表项一句，用「—— 出处」标注出处" },
        items: { type: "array", default: [],      desc: "直接写句子 [{ text, from }]（没填 note 时用）" },
        mode:  { type: "enum",  default: "daily", options: ["daily", "random"], desc: "daily 每天一句，random 每次刷新都换" },
      },
      layout: { w: 12, h: 8 },
      demo: {
        items: [
          { text: "我们塑造工具，然后工具塑造我们。", from: "麦克卢汉" },
          { text: "知识不是力量，用得上的知识才是。", from: "无名氏" },
        ],
      },
    },

    async render({ el, app, props, h, empty, cfg }) {
      let list = [];

      if (props.note) {
        const f = app.vault.getAbstractFileByPath(cfg.path(props.note));
        if (f) list = parseNote(await app.vault.read(f));
      }
      if (!list.length && Array.isArray(props.items)) list = props.items.filter((i) => i && i.text);

      if (!list.length) {
        el.appendChild(empty("还没有句子", "指定一篇摘抄笔记（note），或直接填 items"));
        return;
      }

      const idx =
        props.mode === "random"
          ? Math.floor(Math.random() * list.length)
          : hashOf(new Date().toDateString()) % list.length;
      const q = list[idx];

      el.appendChild(
        h("blockquote.wb-quote", null,
          h("div.wb-quote-text", { text: q.text }),
          q.from ? h("div.wb-quote-from", { text: `—— ${q.from}` }) : null
        )
      );
    },
  };
}
