/* 组件 · quick-actions 快捷入口
 * 首页最实用的一块：一排按钮，点了就去干活 —— 打开某篇笔记、在某个
 * 文件夹新建、执行某条命令、打开网址。 */
(WB) => {
  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  async function newNote(app, folder, template) {
    const dir = WB.config.path(folder);
    if (dir) {
      const exists = app.vault.getAbstractFileByPath(dir);
      if (!exists) await app.vault.createFolder(dir).catch(() => {});
    }
    const path = `${dir ? dir + "/" : ""}未命名 ${stamp()}.md`;
    const file = await app.vault.create(path, template || "");
    await app.workspace.getLeaf(false).openFile(file);
  }

  return {
    meta: {
      id: "quick-actions",
      group: "nav",
      name: { zh: "快捷入口", en: "Quick Actions" },
      desc: {
        zh: "一排动作按钮：打开笔记 / 新建笔记 / 执行命令 / 打开网址",
        en: "A row of action buttons: open a note, create one, run a command, open a URL",
      },
      props: {
        items: {
          type: "array",
          default: [],
          desc:
            '按钮数组。每项写一个动作字段：{ label, icon, note } 打开笔记；' +
            '{ label, icon, folder } 在该文件夹新建；{ label, icon, command } 执行命令；{ label, icon, url } 打开网址',
        },
        label: { type: "text", default: "", desc: "分区标题" },
        style: { type: "enum", default: "chip", options: ["chip", "tile"], desc: "chip 紧凑一排，tile 大方块" },
      },
      layout: { w: 24, h: 6 },
      demo: {
        items: [
          { label: "新笔记", icon: "✏️", folder: "@inbox" },
          { label: "今日日记", icon: "📅", note: "Daily" },
          { label: "工作台", icon: "📊", note: "工作台" },
          { label: "命令面板", icon: "⌘", command: "command-palette:open" },
          { label: "Obsidian 文档", icon: "🔗", url: "https://help.obsidian.md" },
        ],
      },
    },

    async render({ el, app, props, h, empty }) {
      const items = Array.isArray(props.items) ? props.items : [];
      if (!items.length) {
        el.appendChild(
          empty("还没有配置入口", '点⚙设置 items，例如 [{ label: "新笔记", icon: "✏️", folder: "@inbox" }]')
        );
        return;
      }

      const box = h("div.wb-qa");
      if (props.label) {
        box.appendChild(h("div.wb-head", null, h("span.wb-head-label", { text: props.label })));
      }

      const row = h("div.wb-qa-row", { class: props.style === "tile" ? "is-tile" : "is-chip" });

      for (const it of items) {
        const btn = h("button.wb-qa-btn", { type: "button" },
          it.icon ? h("span.wb-qa-icon", { text: it.icon }) : null,
          h("span.wb-qa-label", { text: it.label || "" })
        );

        btn.addEventListener("click", async () => {
          try {
            if (it.note) {
              app.workspace.openLinkText(WB.config.path(it.note), "", false);
            } else if (it.folder !== undefined) {
              await newNote(app, it.folder, it.template);
            } else if (it.command) {
              app.commands.executeCommandById(it.command);
            } else if (it.url) {
              window.open(it.url, "_blank");
            }
          } catch (e) {
            console.error("[Workbench] quick-actions", it, e);
          }
        });

        row.appendChild(btn);
      }

      box.appendChild(row);
      el.appendChild(box);
    },
  };
}
