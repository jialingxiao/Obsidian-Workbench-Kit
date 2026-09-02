# 组件参考

> 本文件由 `scripts/gen-docs.mjs` 从各组件的 `meta` 自动生成，**不要手改**。
> 共 51 个组件，分 6 类。

调用方式：

```js
await dv.view("_wb", { c: "组件名", 参数: 值 })
```

看板模式下也可以直接在「＋ 组件」面板里挑，参数用 ⚙ 表单改。


## 页头

### `banner` · 横幅

带标题的大图横幅，可用库内图片或网络图片

默认格子：24 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `image` | `path` | `""`（空） | 图片路径（库内）或 http 网址 |
| `title` | `text` | `""`（空） | 压在图上的标题 |
| `subtitle` | `text` | `""`（空） | 副标题 |
| `link` | `path` | `""`（空） | 点击后打开的笔记（可留空） |
| `align` | `top` / `center` / `bottom` | `"bottom"` | 文字竖向位置 |
| `overlay` | `bool` | `true` | 文字下加暗色渐变，保证可读 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "banner",
  title: "我的知识库",
  subtitle: "Personal Knowledge Base"
})
```

</details>

### `clock` · 时钟

实时时钟与日期

默认格子：6 列 × 8 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `showSeconds` | `bool` | `false` | 显示秒 |
| `showDate` | `bool` | `true` | 显示日期与星期 |
| `hour12` | `bool` | `false` | 12 小时制 |
| `align` | `left` / `center` / `right` | `"left"` | 对齐方式 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "clock",
  showSeconds: true
})
```

</details>

### `greeting` · 问候语

按钟点变化的问候语，可带一句副标题

默认格子：12 列 × 8 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `name` | `text` | `""`（空） | 称呼，如你的名字 |
| `subtitle` | `text` | `""`（空） | 下面那行小字 |
| `showDate` | `bool` | `true` | 显示日期与星期 |
| `align` | `left` / `center` / `right` | `"left"` | 对齐方式 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "greeting",
  name: "霄哥",
  subtitle: "今天想写点什么？"
})
```

</details>

### `masthead` · 报头

首页顶部标题区，含刊号、大标题、头像、日期与刊次

默认格子：24 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` | `text` | `""`（空） | 主标题，留空则用库名。用 \n 换行 |
| `subtitle` | `text` | `""`（空） | 副标题，小号全大写 |
| `kicker` | `text` | `""`（空） | 左上角小字，如 Vol. I · No.240 |
| `badge` | `text` | `""`（空） | 右上角小字 |
| `avatar` | `path` | `""`（空） | 头像图片路径，如 assets/avatar.png |
| `date` | `bool` | `true` | 底栏显示日期与星期 |
| `edition` | `bool` | `true` | 底栏显示刊次（早间版/晚间版…） |
| `inverted` | `bool` | `true` | 使用反色底块 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "masthead",
  title: "个人知识库",
  subtitle: "Personal Knowledge Base · AI-Maintained Wiki",
  kicker: "Vol. I · No.240",
  badge: "Workbench"
})
```

</details>

### `quote` · 每日一句

每天一句摘抄，来自参数或库里的一篇笔记

默认格子：12 列 × 8 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `note` | `path` | `""`（空） | 句子来源笔记，每个列表项一句，用「—— 出处」标注出处 |
| `items` | `array` | `[]` | 直接写句子 [{ text, from }]（没填 note 时用） |
| `mode` | `daily` / `random` | `"daily"` | daily 每天一句，random 每次刷新都换 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "quote",
  items: [
    {
      text: "我们塑造工具，然后工具塑造我们。",
      from: "麦克卢汉"
    },
    {
      text: "知识不是力量，用得上的知识才是。",
      from: "无名氏"
    }
  ]
})
```

</details>

## 导航入口

### `bookmarks` · 收藏

读取 Obsidian 自带书签，或手写一组常用入口

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `mode` | `native` / `manual` | `"native"` | native 读 Obsidian 书签，manual 用下面的 items |
| `group` | `text` | `""`（空） | 只显示某个书签分组（native 模式） |
| `items` | `array` | `[]` | 手写列表 [{ label, note, icon }]（manual 模式） |
| `limit` | `number` | `12` | 最多显示几条 |
| `columns` | `number` | `2` | 分几列 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "bookmarks",
  mode: "manual",
  label: "常用",
  items: [
    {
      label: "写作计划",
      icon: "📝",
      note: "计划"
    },
    {
      label: "读书笔记",
      icon: "📚",
      note: "读书"
    },
    {
      label: "项目看板",
      icon: "📊",
      note: "项目"
    },
    {
      label: "灵感箱",
      icon: "💡",
      note: "灵感"
    }
  ]
})
```

</details>

### `folders` · 文件夹导航

列出文件夹及各自的笔记数，点击直达

默认格子：8 列 × 14 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 根目录，留空为库根，支持 @别名 |
| `style` | `list` / `chip` | `"list"` | list 带数量列表，chip 紧凑胶囊 |
| `limit` | `number` | `12` | 最多显示几个 |
| `sort` | `count` / `name` | `"count"` | 按数量还是名称排序 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "folders",
  label: "目录"
})
```

</details>

### `quick-actions` · 快捷入口

一排动作按钮：打开笔记 / 新建笔记 / 执行命令 / 打开网址

默认格子：24 列 × 6 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `items` | `array` | `[]` | 按钮数组。每项写一个动作字段：{ label, icon, note } 打开笔记；{ label, icon, folder } 在该文件夹新建；{ label, icon, command } 执行命令；{ label, icon, url } 打开网址 |
| `label` | `text` | `""`（空） | 分区标题 |
| `style` | `chip` / `tile` | `"chip"` | chip 紧凑一排，tile 大方块 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "quick-actions",
  items: [
    {
      label: "新笔记",
      icon: "✏️",
      folder: "@inbox"
    },
    {
      label: "今日日记",
      icon: "📅",
      note: "Daily"
    },
    {
      label: "工作台",
      icon: "📊",
      note: "工作台"
    },
    {
      label: "命令面板",
      icon: "⌘",
      command: "command-palette:open"
    },
    {
      label: "Obsidian 文档",
      icon: "🔗",
      url: "https://help.obsidian.md"
    }
  ]
})
```

</details>

### `search` · 搜索框

在首页直接发起全库搜索，可预置范围

默认格子：10 列 × 6 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `placeholder` | `text` | `"搜索库…"` | 输入框提示文字 |
| `scope` | `path` | `""`（空） | 限定搜索范围（会拼成 path:"…"），支持 @别名 |
| `presets` | `array` | `[]` | 预置查询按钮 [{ label, query }] |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "search",
  presets: [
    {
      label: "待办",
      query: "task-todo:\"\""
    },
    {
      label: "本周",
      query: ""
    },
    {
      label: "无标签",
      query: "-tag:*"
    }
  ]
})
```

</details>

### `tags` · 标签

按使用频次排列的标签，点击搜索该标签

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 统计范围，支持 @别名 |
| `style` | `cloud` / `bars` | `"cloud"` | cloud 标签云，bars 带条形的排行 |
| `limit` | `number` | `24` | 最多显示几个 |
| `minCount` | `number` | `1` | 至少被用过几次才显示 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "tags",
  label: "标签",
  limit: 18
})
```

</details>

## 数据统计

### `attachments` · 附件体检

找出最占地方的附件，或已经没人引用的附件

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `mode` | `unused` / `largest` | `"unused"` | unused 查无人引用，largest 查最占地方 |
| `folder` | `path` | `""`（空） | 只看某个文件夹，留空为全库 |
| `ext` | `text` | `""`（空） | 只看这些扩展名，逗号分隔。留空用默认的常见附件类型 |
| `limit` | `number` | `8` | 最多显示几条 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "attachments",
  label: "附件",
  mode: "largest",
  limit: 6
})
```

</details>

### `breakdown` · 分类占比

按文件夹或自定义范围统计笔记数，画成横向条形图

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 自动模式的根目录，按其子文件夹拆分 |
| `items` | `array` | `[]` | 手动指定 [{ label, source }]，填了就不走自动模式 |
| `limit` | `number` | `8` | 最多显示几项 |
| `sort` | `bool` | `true` | 按数量从多到少排序 |
| `showPercent` | `bool` | `false` | 显示百分比而不是绝对数量 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "breakdown",
  label: "分类",
  source: "",
  items: [],
  limit: 6
})
```

</details>

### `coverage` · 字段体检

某个 frontmatter 字段的填写率，并列出还没填的笔记

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `field` | `text` | `""`（空） | 要检查的字段名，多个候选用逗号分隔（有其一即算已填） |
| `showMiss` | `number` | `5` | 列出几条没填的（0 = 不列） |
| `label` | `text` | `""`（空） | 分区标题，留空用字段名 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "coverage",
  field: "一句话描述",
  showMiss: 4
})
```

</details>

### `goals` · 目标进度

一组带目标值的进度条，当前值可按路径自动统计

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `items` | `array` | `[]` | 目标数组 [{ label, target, source }] 或 [{ label, target, value }]。source 会自动数该路径下的笔记数 |
| `showPercent` | `bool` | `true` | 显示百分比 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "goals",
  label: "今年目标",
  items: [
    {
      label: "写 100 篇笔记",
      target: 100,
      value: 68
    },
    {
      label: "读 24 本书",
      target: 24,
      value: 15
    },
    {
      label: "发表 12 篇",
      target: 12,
      value: 4
    }
  ]
})
```

</details>

### `graph` · 关系图

把引用最多的笔记摆成一圈，画出彼此之间的链接

默认格子：10 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `nodes` | `number` | `12` | 取引用数前几名（3–24） |
| `showLabels` | `bool` | `true` | 显示笔记名 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "graph",
  label: "关系图",
  nodes: 10
})
```

</details>

### `heatmap` · 活动热力图

按天统计笔记数量的周网格，默认统计最近 52 周

默认格子：10 列 × 10 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 统计范围，留空为全库，支持 @别名 |
| `field` | `ctime` / `mtime` | `"ctime"` | 按创建时间还是修改时间统计 |
| `weeks` | `number` | `52` | 显示多少周 |
| `label` | `text` | `""`（空） | 分区标题，留空用默认文案 |
| `showStats` | `bool` | `true` | 右上角显示活跃天数与总数 |
| `showLegend` | `bool` | `true` | 显示 少—多 图例 |
| `showMonths` | `bool` | `true` | 显示月份标签 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "heatmap",
  weeks: 26
})
```

</details>

### `stats` · 指标卡组

一排关键数字，值可写死或按路径自动统计；可附一条进度条

默认格子：14 列 × 10 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `items` | `array` | `[]` | 指标数组，每项 { label, sub, source, value, link }。source 为路径时自动统计笔记数 |
| `columns` | `number` | `0` | 每行几列，0 表示按项目数自适应 |
| `progress` | `object` | `null` | 进度条 { label, value, max } 或 { label, source, maxSource } |
| `label` | `text` | `""`（空） | 分区标题，留空则不显示 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "stats",
  label: "By the Numbers",
  items: [
    {
      label: "Inbox",
      sub: "待消化",
      value: 42
    },
    {
      label: "Notes",
      sub: "笔记",
      value: 318
    },
    {
      label: "Concepts",
      sub: "概念",
      value: 76
    },
    {
      label: "Output",
      sub: "产出",
      value: 12
    }
  ],
  progress: {
    label: "整理进度",
    value: 76,
    max: 318
  }
})
```

</details>

### `trend` · 增长趋势

按周或按月统计新增笔记的柱状图

默认格子：14 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 统计范围，支持 @别名 |
| `field` | `ctime` / `mtime` | `"ctime"` | 按创建还是修改时间 |
| `unit` | `week` / `month` | `"week"` | 按周还是按月 |
| `periods` | `number` | `12` | 显示最近几期 |
| `showValue` | `bool` | `true` | 柱子上显示数字 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "trend",
  label: "近 12 周新增",
  periods: 12
})
```

</details>

### `vault-info` · 库总览

笔记数、附件数、标签数、最早的一篇等库级信息

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `showWords` | `bool` | `false` | 统计总字数（要读全部笔记内容，库大时会慢） |
| `showOldest` | `bool` | `true` | 显示最早的一篇 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "vault-info",
  label: "库总览"
})
```

</details>

## 笔记流

### `hubs` · 枢纽笔记

被引用最多的笔记，库里自然形成的中心

默认格子：10 列 × 14 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `limit` | `number` | `8` | 最多显示几条 |
| `style` | `bars` / `list` | `"bars"` | bars 带条形，list 纯列表 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "hubs",
  label: "枢纽笔记",
  limit: 7
})
```

</details>

### `notes` · 笔记列表

自定义范围、排序与过滤的通用笔记列表

默认格子：10 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名、#标签、Dataview 查询串 |
| `sort` | `mtime` / `ctime` / `name` / `random` | `"mtime"` | 排序方式 |
| `order` | `desc` / `asc` | `"desc"` | 升序还是降序 |
| `limit` | `number` | `10` | 最多显示几条 |
| `hasField` | `text` | `""`（空） | 只显示含有该 frontmatter 字段的笔记 |
| `descField` | `text` | `""`（空） | 摘要字段名，多个用逗号分隔 |
| `showTime` | `bool` | `true` | 右侧显示相对时间 |
| `showPath` | `bool` | `false` | 显示所在文件夹 |
| `bullet` | `text` | `""`（空） | 每行前缀符号，如 · |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "notes",
  label: "笔记",
  limit: 7,
  showPath: true,
  descField: "一句话描述"
})
```

</details>

### `on-this-day` · 那年今日

往年今天创建的笔记，库用得越久越有意思

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `field` | `ctime` / `mtime` | `"ctime"` | 按创建还是修改时间 |
| `window` | `number` | `0` | 前后几天也算（0 = 只看当天） |
| `limit` | `number` | `6` | 最多显示几条 |
| `descField` | `text` | `""`（空） | 摘要字段名 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "on-this-day",
  label: "那年今日",
  window: 3,
  limit: 5
})
```

</details>

### `opened` · 最近打开

按你实际打开过的顺序列出笔记（≠ 最近修改）

默认格子：10 列 × 14 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `limit` | `number` | `8` | 最多显示几条 |
| `source` | `path` | `""`（空） | 只看某个范围，支持 @别名。留空为全库 |
| `skipFirst` | `number` | `0` | 跳过最前面几条（0 通常是当前这篇首页） |
| `showFolder` | `bool` | `true` | 显示所在文件夹 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "opened",
  label: "最近打开",
  limit: 7
})
```

</details>

### `orphans` · 孤岛笔记

没有任何反向链接的笔记，容易被遗忘的那批

默认格子：10 列 × 14 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `limit` | `number` | `8` | 最多显示几条 |
| `alsoNoLinks` | `bool` | `false` | 同时要求它自己也没有出链（完全孤立） |
| `sort` | `ctime` / `mtime` / `random` | `"ctime"` | 排序方式 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "orphans",
  label: "孤岛笔记",
  limit: 6
})
```

</details>

### `reading` · 在读进度

带进度字段的笔记加进度条，读书、追论文都用得上

默认格子：10 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `field` | `text` | `"进度"` | 进度字段名，多个候选用逗号分隔。值可写 65、65%、120/300 |
| `totalField` | `text` | `""`（空） | 总数字段名（进度里没写分母时用） |
| `limit` | `number` | `6` | 最多显示几条 |
| `hideDone` | `bool` | `false` | 隐藏已读完的 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "reading",
  label: "在读",
  field: "进度",
  limit: 4
})
```

</details>

### `recent` · 最近笔记

按修改或创建时间列出最近的笔记

默认格子：10 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，留空为全库，支持 @别名 |
| `field` | `mtime` / `ctime` | `"mtime"` | 按修改还是创建时间排序 |
| `limit` | `number` | `8` | 最多显示几条 |
| `label` | `text` | `""`（空） | 分区标题 |
| `showTime` | `bool` | `true` | 右侧显示相对时间 |
| `showFolder` | `bool` | `false` | 标题下显示所在文件夹 |
| `descField` | `text` | `""`（空） | 用作摘要的 frontmatter 字段名，如 一句话描述 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "recent",
  label: "最近更新",
  limit: 6,
  showFolder: true
})
```

</details>

### `spotlight` · 今日精选

每天从库里挑一篇笔记推荐给你，也可切换成随机漫游

默认格子：14 列 × 10 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 挑选范围，支持 @别名 |
| `mode` | `daily` / `random` | `"daily"` | daily 每天一篇，random 可手动换 |
| `descField` | `text` | `"一句话描述"` | 摘要字段名，多个用逗号分隔 |
| `label` | `text` | `""`（空） | 分区标题 |
| `kicker` | `text` | `"今日精选"` | 左上角小标签 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "spotlight",
  kicker: "Today's Pick · 今日精选"
})
```

</details>

### `stale` · 久未回顾

超过一段时间没有改动过的笔记，提醒你回头看看

默认格子：10 列 × 14 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `months` | `number` | `6` | 多久没动算「久」（月） |
| `field` | `mtime` / `ctime` | `"mtime"` | 按修改还是创建时间 |
| `limit` | `number` | `8` | 最多显示几条 |
| `oldest` | `bool` | `true` | 最久的排前面（关掉则最近的在前） |
| `descField` | `text` | `""`（空） | 摘要字段名 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "stale",
  label: "久未回顾",
  months: 3,
  limit: 6
})
```

</details>

### `table` · 表格

自选字段当列的通用表格，任何「按字段列出笔记」的需求都用它

默认格子：16 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名、#标签 |
| `columns` | `array` | `["file","mtime"]` | 列。写字段名即可，如 ["file","状态","mtime"]；也可写 [{field:"状态",label:"进度",width:"80px"}]。内置列名：file / path / folder / mtime / ctime / tags / size |
| `sort` | `text` | `"mtime"` | 排序字段，可用内置列名或任意 frontmatter 字段 |
| `order` | `desc` / `asc` | `"desc"` |  |
| `limit` | `number` | `10` | 最多显示几行 |
| `hasField` | `text` | `""`（空） | 只显示含有该字段的笔记 |
| `compact` | `bool` | `false` | 紧凑行高 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "table",
  label: "最近笔记",
  columns: [
    "file",
    "一句话描述",
    "mtime"
  ],
  limit: 8
})
```

</details>

### `timeline` · 时间线

按日期排成一条竖轴，同一天的归成一组

默认格子：10 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `dateField` | `text` | `""`（空） | 日期字段名，多个候选用逗号分隔。取不到则用文件时间 |
| `fallback` | `ctime` / `mtime` | `"ctime"` | 取不到字段时用哪个时间 |
| `limit` | `number` | `12` | 最多显示几条 |
| `order` | `desc` / `asc` | `"desc"` | 新的在上还是旧的在上 |
| `descField` | `text` | `""`（空） | 摘要字段名 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "timeline",
  label: "时间线",
  limit: 10,
  descField: "一句话描述"
})
```

</details>

### `untagged` · 待整理

缺标签 / 缺指定字段 / 内容过短的笔记

默认格子：10 列 × 14 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `rule` | `untagged` / `noField` / `short` | `"untagged"` | 判定规则 |
| `field` | `text` | `"一句话描述"` | noField 规则要检查的字段名 |
| `minLength` | `number` | `200` | short 规则的字数下限 |
| `limit` | `number` | `8` | 最多显示几条 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "untagged",
  label: "待整理",
  rule: "untagged",
  limit: 6
})
```

</details>

## 任务与计划

### `calendar` · 月历

整月日历，写过日记的日期点亮可点开

默认格子：8 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `folder` | `path` | `"@daily"` | 日记所在文件夹 |
| `format` | `text` | `"YYYY-MM-DD"` | 文件名日期格式 |
| `showCount` | `bool` | `true` | 标题右侧显示本月已写篇数 |
| `label` | `text` | `""`（空） | 分区标题，留空显示「YYYY年M月」 |

### `countdown` · 倒计时

距某天还有多少天，或已经过去多少天。只写月日则每年重复

默认格子：10 列 × 8 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `items` | `array` | `[]` | [{ label, date }]。date 写 2026-12-31 或 12-31（每年重复）。加 mode: "since" 则显示「已过去多少天」 |
| `columns` | `number` | `0` | 每行几个，0 表示自适应 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "countdown",
  label: "倒计时",
  items: [
    {
      label: "年底",
      date: "12-31"
    },
    {
      label: "项目交付",
      date: "2026-11-15"
    }
  ]
})
```

</details>

### `daily` · 日记入口

直达今天的日记，并显示最近几天的完成情况

默认格子：8 列 × 10 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `folder` | `path` | `"@daily"` | 日记所在文件夹 |
| `format` | `text` | `"YYYY-MM-DD"` | 文件名日期格式，支持 YYYY MM DD |
| `days` | `number` | `14` | 回顾最近几天 |
| `template` | `path` | `""`（空） | 新建时套用的模板文件（可留空） |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "daily",
  label: "日记",
  days: 14
})
```

</details>

### `habit` · 习惯打卡

习惯 × 日期网格，数据来自日记里已勾选的待办，不用另记一份

默认格子：12 列 × 12 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `habits` | `array` | `[]` | 习惯名数组，如 ["晨跑","读书","冥想"]。会去日记的待办文本里做包含匹配 |
| `folder` | `path` | `"@daily"` | 日记所在文件夹 |
| `format` | `text` | `"YYYY-MM-DD"` | 文件名日期格式 |
| `days` | `number` | `21` | 回看多少天 |
| `showRate` | `bool` | `true` | 右侧显示完成率 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "habit",
  label: "习惯",
  habits: [
    "晨跑",
    "读书",
    "冥想"
  ],
  days: 14
})
```

</details>

### `kanban` · 分列看板

按某个 frontmatter 字段把笔记分成几列，比如按 status 看进度

默认格子：24 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `field` | `text` | `"status"` | 用来分列的字段名，多个候选用逗号分隔。填 folder 则按文件夹分列 |
| `columns` | `array` | `[]` | 列的顺序，如 ["待办","进行中","已完成"]。留空则自动取该字段出现过的值 |
| `limit` | `number` | `6` | 每列最多显示几张卡片 |
| `showEmpty` | `bool` | `false` | 显示没有卡片的列 |
| `descField` | `text` | `""`（空） | 卡片副标题取哪个字段 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "kanban",
  label: "进度",
  field: "folder",
  limit: 3
})
```

</details>

### `streak` · 连续记录

连续多少天有产出，以及历史最长纪录

默认格子：8 列 × 8 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 统计范围，留空为全库，支持 @别名 |
| `field` | `ctime` / `mtime` | `"ctime"` | 按创建还是修改时间 |
| `unit` | `text` | `"天"` | 单位文字 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "streak",
  label: "连续记录"
})
```

</details>

### `tasks` · 待办

汇总笔记里的待办事项，可直接勾选（会写回原笔记）

默认格子：10 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，留空为全库，支持 @别名 |
| `limit` | `number` | `12` | 最多显示几条 |
| `showDone` | `bool` | `false` | 是否包含已完成的 |
| `groupByFile` | `bool` | `true` | 按所在笔记分组 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "tasks",
  label: "待办",
  limit: 8
})
```

</details>

### `upcoming` · 即将到期

带日期的待办按时间排序，逾期的标红

默认格子：10 列 × 14 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `source` | `path` | `""`（空） | 范围，支持 @别名 |
| `days` | `number` | `14` | 往后看几天 |
| `showOverdue` | `bool` | `true` | 包含已逾期的 |
| `limit` | `number` | `10` | 最多显示几条 |
| `label` | `text` | `""`（空） | 分区标题 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "upcoming",
  label: "即将到期",
  days: 14
})
```

</details>

### `week` · 本周

七天一排，显示每天的日记状态与待办数量，点击直达当天日记

默认格子：24 列 × 10 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `folder` | `path` | `"@daily"` | 日记所在文件夹 |
| `format` | `text` | `"YYYY-MM-DD"` | 文件名日期格式 |
| `startMonday` | `bool` | `true` | 周一为一周之首（关掉则周日开始） |
| `showTasks` | `bool` | `true` | 显示当天日记里的待办数 |
| `offset` | `number` | `0` | 偏移几周。0 是本周，-1 是上周 |
| `label` | `text` | `""`（空） | 分区标题，留空显示日期范围 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "week",
  label: "本周"
})
```

</details>

## 版面元素

### `divider` · 分隔线

一条分隔线，或一段纯留白

默认格子：24 列 × 4 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `style` | `line` / `double` / `dashed` / `space` | `"line"` | line 细线，double 双线，dashed 虚线，space 纯留白 |
| `label` | `text` | `""`（空） | 线中间的文字（space 模式无效） |

### `embed` · 嵌入笔记

把一篇笔记或它的某个小节渲染到看板里

默认格子：12 列 × 16 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `note` | `path` | `""`（空） | 要嵌入的笔记路径，支持 @别名 |
| `heading` | `text` | `""`（空） | 只嵌入这个标题下的内容，留空则整篇 |
| `stripFront` | `bool` | `true` | 去掉 frontmatter |
| `showTitle` | `bool` | `true` | 顶部显示可点击的笔记名 |

### `heading` · 分区标题

给看板分段用的标题，可带右侧说明

默认格子：24 列 × 4 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `text` | `text` | `"分区"` | 标题文字 |
| `note` | `text` | `""`（空） | 右侧小字说明 |
| `size` | `sm` / `md` / `lg` | `"md"` | 字号 |
| `rule` | `under` / `none` / `over` | `"under"` | 线的位置 |
| `align` | `left` / `center` | `"left"` | 对齐方式 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "heading",
  text: "今天",
  note: "Today"
})
```

</details>

### `text` · 文本块

在看板上直接写一段自由文字

默认格子：8 列 × 8 行（加进看板后会按实际内容自动定高）

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `content` | `text` | `""`（空） | 正文，用 \n 换行 |
| `title` | `text` | `""`（空） | 小标题 |
| `size` | `sm` / `md` / `lg` | `"md"` | 字号 |
| `align` | `left` / `center` | `"left"` | 对齐方式 |
| `boxed` | `bool` | `false` | 加个边框底色，变成便签的样子 |

<details><summary>示例</summary>

```js
await dv.view("_wb", {
  c: "text",
  title: "提醒",
  content: "每周日晚上回顾一次本周笔记。\\n把值得展开的挑出来。"
})
```

</details>
