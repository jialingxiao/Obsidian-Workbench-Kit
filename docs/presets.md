# 模板参考

> 本文件由 `scripts/gen-docs.mjs` 自动生成，**不要手改**。

模板是 `_wb/presets/*.json`，格式和看板布局文件一样。自己加一个就会出现在「⚡ 模板」列表里。
套用时会跑一遍布局算法并按实际内容重新定高，所以手写坐标不必精确。


## 知识库（`knowledge`）

报头 + 数据概览 + 精选 / 标签 / 枢纽 / 孤岛，完整的知识库仪表盘

默认主题：朱砂　·　9 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `masthead` | x0 y0 | 12×6 |
| `stats` | x0 y6 | 7×5 |
| `heatmap` | x7 y6 | 5×5 |
| `spotlight` | x0 y11 | 7×5 |
| `tags` | x7 y11 | 5×6 |
| `recent` | x0 y16 | 6×8 |
| `hubs` | x6 y17 | 6×7 |
| `orphans` | x0 y24 | 6×7 |
| `untagged` | x6 y24 | 6×7 |

## 生活雅集（`life`）

农历、节气、诗词与习惯打卡，最不像仪表盘的一套

默认主题：竹影　·　11 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `greeting` | x0 y0 | 7×4 |
| `analog-clock` | x7 y0 | 5×6 |
| `lunar` | x0 y4 | 4×6 |
| `solar-term` | x4 y4 | 3×6 |
| `week` | x7 y6 | 5×6 |
| `habit` | x0 y10 | 7×8 |
| `countdown` | x7 y12 | 5×6 |
| `poem` | x0 y18 | 4×8 |
| `seal` | x4 y18 | 3×8 |
| `year-progress` | x7 y18 | 5×4 |
| `quote` | x7 y22 | 5×4 |

## 工作台（`office`）

以「今天要收尾什么」为中心：临期、待办、按状态分列、产出趋势

默认主题：曜石　·　9 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `clock` | x0 y0 | 3×4 |
| `greeting` | x3 y0 | 6×4 |
| `year-progress` | x9 y0 | 3×4 |
| `quick-actions` | x0 y4 | 12×4 |
| `upcoming` | x0 y8 | 5×9 |
| `tasks` | x5 y8 | 7×9 |
| `kanban` | x0 y17 | 12×8 |
| `trend` | x0 y25 | 7×6 |
| `breakdown` | x7 y25 | 5×6 |

## 日程计划（`planner`）

时钟 + 日记 + 月历 + 到期待办，以「今天」为中心

默认主题：素笺　·　8 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `clock` | x0 y0 | 3×4 |
| `greeting` | x3 y0 | 9×4 |
| `daily` | x0 y4 | 4×6 |
| `calendar` | x4 y4 | 4×9 |
| `streak` | x8 y4 | 4×4 |
| `upcoming` | x8 y8 | 4×7 |
| `tasks` | x0 y10 | 4×8 |
| `heatmap` | x0 y18 | 12×5 |

## 项目管理（`project`）

目标 + 里程碑倒计时 + 状态分列 + 明细表，盯住「还差多少」

默认主题：绀宇　·　8 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `heading` | x0 y0 | 12×2 |
| `goals` | x0 y2 | 5×7 |
| `countdown` | x5 y2 | 7×7 |
| `kanban` | x0 y9 | 12×9 |
| `table` | x0 y18 | 7×9 |
| `upcoming` | x7 y18 | 5×9 |
| `coverage` | x0 y27 | 6×6 |
| `breakdown` | x6 y27 | 6×6 |

## 阅读台（`reading`）

在读进度 + 摘抄 + 那年今日，一页安静的读书桌

默认主题：宣纸　·　8 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `masthead` | x0 y0 | 12×6 |
| `reading` | x0 y6 | 7×8 |
| `streak` | x7 y6 | 5×4 |
| `quote` | x7 y10 | 5×4 |
| `notes` | x0 y14 | 7×9 |
| `on-this-day` | x7 y14 | 5×9 |
| `poem` | x0 y23 | 5×8 |
| `heatmap` | x5 y23 | 7×8 |

## 研究台（`research`）

关系图 + 枢纽 / 孤岛 + 字段体检，盯的是「知识网结不结实」

默认主题：水墨　·　9 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `masthead` | x0 y0 | 12×6 |
| `graph` | x0 y6 | 7×9 |
| `hubs` | x7 y6 | 5×9 |
| `timeline` | x0 y15 | 7×9 |
| `orphans` | x7 y15 | 5×9 |
| `tags` | x0 y24 | 5×7 |
| `coverage` | x5 y24 | 7×7 |
| `stale` | x0 y31 | 6×7 |
| `vault-info` | x6 y31 | 6×7 |

## 极简起步（`start`）

问候 + 快捷入口 + 最近笔记与待办，四块起步

默认主题：_不指定，沿用当前_　·　4 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `greeting` | x0 y0 | 12×4 |
| `quick-actions` | x0 y4 | 12×3 |
| `recent` | x0 y7 | 6×8 |
| `tasks` | x6 y7 | 6×8 |

## 写作台（`writing`）

目标 + 产出趋势 + 进行中的稿子，盯住「写了多少」

默认主题：秋毫　·　6 个组件

| 组件 | 位置 | 尺寸 |
|---|---|---|
| `masthead` | x0 y0 | 12×5 |
| `goals` | x0 y5 | 5×6 |
| `trend` | x5 y5 | 7×6 |
| `notes` | x0 y11 | 6×9 |
| `quote` | x6 y11 | 6×4 |
| `text` | x6 y15 | 6×5 |
