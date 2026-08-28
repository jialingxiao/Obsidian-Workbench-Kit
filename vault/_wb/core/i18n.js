/* core/i18n.js · 文案与本地化
 * locale 从 config 里懒读（config 模块在本模块之后加载，所以只能
 * 在函数体里访问 WB.config，不能在工厂里就取）。 */
(WB) => {
  const DICT = {
    zh: {
      "err.title": "组件出错",
      "err.hint": "改完配置后按 Ctrl+E 切换编辑/阅读模式即可重新渲染。",
      "err.unknown": "未知组件",
      "empty.default": "这里还没有内容",
      "empty.hint": "先去创建第一篇笔记吧",
      "heatmap.label": "活动记录",
      "heatmap.less": "少",
      "heatmap.more": "多",
      "heatmap.days": "{n} 天有活动",
      "heatmap.total": "共 {n} 条",
      "heatmap.notes": "{n} 条笔记",
      "edition.night": "深夜版",
      "edition.morning": "早间版",
      "edition.noon": "午间版",
      "edition.afternoon": "下午版",
      "edition.evening": "晚间版",
      "stats.empty": "没有配置任何指标",
    },
    en: {
      "err.title": "Component error",
      "err.hint": "Toggle edit/reading mode (Ctrl+E) to re-render after fixing.",
      "err.unknown": "Unknown component",
      "empty.default": "Nothing here yet",
      "empty.hint": "Create your first note to get started",
      "heatmap.label": "Activity",
      "heatmap.less": "Less",
      "heatmap.more": "More",
      "heatmap.days": "{n} active days",
      "heatmap.total": "{n} total",
      "heatmap.notes": "{n} notes",
      "edition.night": "Night Edition",
      "edition.morning": "Morning Edition",
      "edition.noon": "Noon Edition",
      "edition.afternoon": "Afternoon Edition",
      "edition.evening": "Evening Edition",
      "stats.empty": "No metrics configured",
    },
  };

  const locale = () => {
    const l = WB.config && WB.config.data && WB.config.data.locale;
    return DICT[l] ? l : "zh";
  };

  function t(key, vars) {
    const l = locale();
    let s = (DICT[l] && DICT[l][key]) ?? (DICT.zh && DICT.zh[key]) ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }

  /* meta 里的 name/desc 写成 { zh, en }，用它取当前语言的那一份。
   * 传普通字符串也照样返回。 */
  function pick(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[locale()] ?? v.zh ?? v.en ?? "";
  }

  /* 日期格式化。刻意不用 Dataview 的 luxon，这样组件在浏览器
   * 预览器（dev/preview.html）里也能跑。 */
  const WEEK_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatDate(d) {
    if (locale() === "en") {
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function formatWeekday(d) {
    if (locale() === "en") return d.toLocaleDateString("en-US", { weekday: "long" });
    return WEEK_ZH[d.getDay()];
  }

  function monthShort(i) {
    return locale() === "en" ? MONTH_EN[i] : `${i + 1}月`;
  }

  /* 按当前钟点给出「早间版 / 晚间版」这类刊次标签 */
  function edition(d) {
    const hour = d.getHours();
    const key =
      hour < 6 ? "night" : hour < 12 ? "morning" : hour < 14 ? "noon" : hour < 18 ? "afternoon" : "evening";
    return t(`edition.${key}`);
  }

  /* 相对时间。列表里显示「3 小时前」比一个绝对日期有用得多。 */
  function fromNow(d) {
    if (!d) return "";
    const en = locale() === "en";
    const sec = Math.round((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return en ? "just now" : "刚刚";
    const min = Math.round(sec / 60);
    if (min < 60) return en ? `${min}m ago` : `${min} 分钟前`;
    const hr = Math.round(min / 60);
    if (hr < 24) return en ? `${hr}h ago` : `${hr} 小时前`;
    const day = Math.round(hr / 24);
    if (day === 1) return en ? "yesterday" : "昨天";
    if (day < 30) return en ? `${day}d ago` : `${day} 天前`;
    return formatDate(d);
  }

  /* 极简日期模板：YYYY / MM / DD / M / D。够周期笔记文件名用了，
   * 不为此引入 moment 或 luxon。 */
  function formatPattern(d, pattern) {
    const p = (n) => String(n).padStart(2, "0");
    return String(pattern || "YYYY-MM-DD")
      .replace(/YYYY/g, d.getFullYear())
      .replace(/MM/g, p(d.getMonth() + 1))
      .replace(/DD/g, p(d.getDate()))
      .replace(/\bM\b/g, d.getMonth() + 1)
      .replace(/\bD\b/g, d.getDate());
  }

  return { t, pick, locale, formatDate, formatWeekday, monthShort, edition, fromNow, formatPattern };
}
