/* core/dom.js · 极简 DOM 构造器
 * 组件里一律用 h() 建节点，不要拼 innerHTML —— 拼字符串既容易被
 * 笔记标题里的 < > & 打断，也让 XSS 有可乘之机。 */
(WB) => {
  function append(el, children) {
    for (const c of children) {
      if (c == null || c === false || c === true) continue;
      if (Array.isArray(c)) append(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    }
  }

  /* h("div.wb-card", { style: {...}, text: "hi" }, child1, child2)
   * 标签支持 .class 简写：h("span.wb-tag.is-on") */
  function h(spec, props, ...children) {
    const m = /^([a-zA-Z][a-zA-Z0-9-]*)((?:\.[^.\s]+)*)$/.exec(String(spec || "div"));
    const tag = m ? m[1] : "div";
    const classes = m && m[2] ? m[2].split(".").filter(Boolean) : [];

    const el = document.createElement(tag);
    if (classes.length) el.classList.add(...classes);

    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === "class" || k === "cls") {
          el.classList.add(...String(v).split(/\s+/).filter(Boolean));
        } else if (k === "style") {
          /* 自定义属性（--wb-*）必须走 setProperty。
             以前这里是 Object.assign(el.style, v)，而 CSSStyleDeclaration
             对 "--x" 这种键的直接赋值是静默忽略的 —— 于是 kanban 的列数、
             stats / bookmarks / image / countdown 的 columns、habit 的天数、
             ui.cols 的柱数，全都悄悄退回 CSS 里的默认值。
             库里所有 columns 参数都因此形同虚设，且不报任何错。 */
          if (typeof v === "object") {
            for (const [ck, cv] of Object.entries(v)) {
              if (cv == null) continue;
              if (ck.startsWith("--")) el.style.setProperty(ck, String(cv));
              else el.style[ck] = cv;
            }
          } else el.setAttribute("style", String(v));
        } else if (k === "dataset") {
          Object.assign(el.dataset, v);
        } else if (k === "text") {
          el.textContent = String(v);
        } else if (k.startsWith("on") && typeof v === "function") {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else {
          el.setAttribute(k, v === true ? "" : String(v));
        }
      }
    }

    append(el, children);
    return el;
  }

  function frag(...children) {
    const f = document.createDocumentFragment();
    append(f, children);
    return f;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  /* Obsidian 内部链接。
   * 光靠 class="internal-link" 在自建 DOM 里不一定被接管，所以自己接上
   * openLinkText（跳转）和 hover-link 事件（悬浮预览）—— 这两件事是
   * 「链接在 Obsidian 里应有的样子」，缺了会很别扭。 */
  function link(path, label, opts) {
    const o = opts || {};
    const a = h("a.internal-link.wb-link", {
      href: path,
      "data-href": path,
      target: "_blank",
      rel: "noopener",
    }, label == null ? path : label);

    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try {
        WB.app.workspace.openLinkText(path, o.from || "", ev.ctrlKey || ev.metaKey);
      } catch (e) {
        console.warn("[Workbench] 打开链接失败", path, e);
      }
    });

    a.addEventListener("mouseover", (ev) => {
      try {
        WB.app.workspace.trigger("hover-link", {
          event: ev, source: "preview", hoverParent: a, targetEl: a, linktext: path,
        });
      } catch (e) { /* 悬浮预览不是必需能力，失败就算了 */ }
    });

    return a;
  }

  return { h, frag, clear, append, link };
}
