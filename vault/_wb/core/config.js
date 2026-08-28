/* core/config.js · 配置读取与路径别名
 * 这是整套组件库唯一需要用户改的东西。别名机制（@inbox）是
 * 「同一份组件能在不同库里复用」的关键 —— 组件里绝不出现具体路径。 */
(WB) => (async () => {
  const DEFAULTS = {
    theme: "素笺",
    locale: "zh",
    dev: false,
    paths: {},
    tokens: {},
  };

  /* JSON 不支持注释，但用户很容易照着示例里的注释写，所以宽容处理 */
  function stripComments(s) {
    return s.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  }

  const raw = await WB.tryRead("config.json");
  let user = {};
  let error = null;

  if (raw != null && raw.trim() !== "") {
    try {
      user = JSON.parse(stripComments(raw));
    } catch (e) {
      error = `config.json 解析失败：${e.message}`;
    }
  }

  const data = {
    ...DEFAULTS,
    ...user,
    paths: { ...DEFAULTS.paths, ...(user.paths || {}) },
    tokens: { ...DEFAULTS.tokens, ...(user.tokens || {}) },
  };

  /* "@inbox"        → "00.raw"
   * "@inbox/books"  → "00.raw/books"
   * "01.Wiki"       → 原样返回
   * 别名没定义就抛错，交给 runtime 的错误卡去显示 —— 静默返回空
   * 会变成「组件空白但不知道为什么」，那是最糟的失败方式。 */
  function path(p) {
    if (typeof p !== "string" || !p.startsWith("@")) return p;
    // 别名 = @ 之后到第一个 / 或空白之前的全部字符。刻意不限制成
    // ASCII：中文别名（@收件箱）必须能用，否则会被当成普通路径静默
    // 查出空结果 —— 那是最难排查的一种失败。
    const m = /^@([^/\s]+)(.*)$/.exec(p);
    if (!m) return p;
    const base = data.paths[m[1]];
    if (base == null) {
      const known = Object.keys(data.paths);
      throw new Error(
        `未定义的路径别名 "@${m[1]}"。请在 ${WB.root}/config.json 的 paths 里加上它` +
          (known.length ? `（已定义：${known.map((k) => "@" + k).join("、")}）` : "")
      );
    }
    return base + (m[2] || "");
  }

  /* 颜色类参数支持 "@accent" 形式，映射到 CSS 变量，让它跟着主题走 */
  function token(v) {
    if (typeof v !== "string" || !v.startsWith("@")) return v;
    return `var(--wb-${v.slice(1)})`;
  }

  return { data, error, path, token, DEFAULTS };
})()
