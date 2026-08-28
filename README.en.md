# Obsidian Workbench Kit

[中文](README.md) · English

A component library for Obsidian homepages. Drop the `_wb/` folder into your vault, create a note, and assemble your own dashboard — no CSS to write, no snippets to install.

> Status: **v0.4.2**. Visual board, **51 components in 7 categories**, **12 themes**, 4 ready-made layouts, and a packaged plugin build.

---

## The problem it solves

The Obsidian community has plenty of beautiful homepages, but nearly all of them are **one-off artwork**: folder paths hard-coded inside `dataviewjs`, styling tangled with data logic. Move to another vault and you start over.

This kit pulls three things apart:

| | Owned by | What you change |
|---|---|---|
| **Data source** | Path aliases in `config.json` | 4 lines of folder mapping |
| **Render logic** | Components in `components/` | Nothing |
| **Visual theme** | CSS variables in `themes/` | One field |

Components always say `@inbox`, never `00.raw`. That is what makes the same component work in any vault.

---

## Install

**Requires** the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin with **JavaScript Queries** enabled.

1. Copy `vault/_wb/` into your vault root (so you end up with `YourVault/_wb/`).
2. Open `_wb/config.json` and point the aliases at your real folders:

   ```json
   "paths": {
     "inbox":  "00.Inbox",
     "notes":  "01.Notes",
     "daily":  "Daily",
     "output": "99.Output"
   }
   ```

3. Copy `examples/工作台.md` (the board note) into your vault and open it.

No CSS snippet needed — styles are injected at runtime.

---

## Usage

### Board mode (recommended)

The entire homepage is one line:

````markdown
```dataviewjs
await dv.view("_wb")
```
````

A toolbar appears at the top:

| Button | What it does |
|---|---|
| **✏️ Edit** | Enter edit mode. **Off by default** — you click links on your homepage every day; accidentally dragging the layout around would be maddening |
| **＋ Component** | Pick a component; it finds a free slot and sizes itself to its content |
| **⚡ Preset** | Lay down a whole ready-made board in one click |
| **↩ Undo** | Step back (up to 20), so deleting a component isn't final |
| **🎨 Theme** | Switch every component to a different palette at once |

In edit mode: drag the title bar to move, drag the bottom-right corner to resize, ⚙ to edit props (the form is generated from the component's own schema), ✕ to delete. Leave edit mode and every outline disappears — it just looks like a designed page.

Layouts live in `_wb/boards/<note-name>.json`. **Each note gets its own layout**, so you can keep several boards for different purposes.

### Single-component mode

Any component can be embedded in any note:

````markdown
```dataviewjs
await dv.view("_wb", { c: "heatmap", source: "@inbox", weeks: 52 })
```
````

Recommended frontmatter for a homepage note:

```yaml
---
cssclasses: [wb-page]      # full width, hides the title bar — homepage only
obsidianUIMode: preview    # reading mode; dragging feels best here
---
```

---

## Components

51 components across 7 categories. Full parameter reference: **[docs/components.md](docs/components.md)** (generated from source).

| Category | Components |
|---|---|
| **Header** | `masthead` `clock` `greeting` `quote` `banner` |
| **Navigation** | `quick-actions` `bookmarks` `folders` `tags` `search` |
| **Metrics** | `stats` `heatmap` `breakdown` `trend` `vault-info` `goals` `coverage` `attachments` `graph` |
| **Notes** | `recent` `notes` `table` `timeline` `spotlight` `orphans` `hubs` `untagged` `stale` `on-this-day` `opened` `reading` |
| **Tasks & Planning** | `tasks` `daily` `week` `calendar` `upcoming` `streak` `kanban` `habit` `countdown` |
| **Layout** | `heading` `divider` `text` `embed` |
| **Decorative** | `seal` `poem` `solar-term` `lunar` `year-progress` `analog-clock` `image` |

A few worth calling out:

- **`tasks`** — collects checkboxes vault-wide and they're **actually tickable**; the write-back is delegated to Dataview's own renderer rather than hand-rolled, because editing the wrong line of someone's note is not a risk worth taking.
- **`bookmarks`** — reads Obsidian's native bookmarks. Zero config.
- **`orphans`** / **`hubs`** — two sides of the same coin: notes nothing links to, and the notes everything links to.
- **`breakdown`** / **`folders`** / **`tags`** — auto-derive their content from your vault structure, so they show something real the moment you drop them in.

---

## Themes

12 themes, named after traditional Chinese materials and pigments. Full reference: **[docs/themes.md](docs/themes.md)**.

| id | Name | Character | Typeface |
|---|---|---|---|
| `sujian` | 素笺 Plain Letter | Neutral default; follows your Obsidian theme and light/dark mode | System UI |
| `xuanzhi` | 宣纸 Xuan Paper | Off-white paper, ink black, cinnabar accent, faint paper grain | Song (serif) |
| `shuimo` | 水墨 Ink Wash | Cool grey paper, two ink tones, more space than mark | Kai headings + Hei body |
| `zhusha` | 朱砂 Cinnabar | Black-and-red magazine layout, heavy display type | Serif (Playfair / Song) |
| `qingci` | 青瓷 Celadon | Celadon glaze ground, sky-blue accent, generous radii | Song (serif) |
| `qiuhao` | 秋毫 Autumn Brush | Cream paper and gold-brown; like an open manuscript | Georgia serif |
| `zhuying` | 竹影 Bamboo Shade | Pale green with bamboo accent, rounded and light | Rounded sans |
| `songyan` | 松烟 Pine Soot | Deep ink ground with gold-brown — a serif in the dark | Song (dark) |
| `dianlan` | 靛蓝 Indigo | Deep indigo with moon-white text; easiest at night | Hei (dark) |
| `ganyu` | 绀宇 Deep Azure | Warm peach paper under deep azure — the one coloured light ground | Hei body + Song headings |
| `yaoshi` | 曜石 Obsidian Glass | Near-black with electric blue and marigold, raised panels | Hei (dark) |
| `chenlv` | 沉绿 Deep Green | Deep green night with a green-tea accent; the liveliest dark | Rounded sans (dark) |

The first eight are light designs with dark-mode overrides; the last four are **committed dark** — they stay dark even in light mode, deliberately.

### The rules behind the set

1. **Components never hard-code colour or type.** Everything goes through `--wb-*`. One component with `#C41E3A` in it and every theme breaks on that component.
2. **Typefaces come from a shared pool** (`--wb-f-song / -kai / -hei / -yuan / -fangsong / -serif / -mono`), each stack ordered macOS → Windows → Source Han/Noto → generic. **Only fonts already on the system; nothing fetched over the network** — the kit has to work offline, and reading comfort shouldn't depend on a CDN.
3. **Every theme clears a contrast bar** before it ships, and **the bar on dark grounds is about 1.5× the light one**. WCAG 2's ratio systematically overstates legibility on dark backgrounds — the same 4.6:1 that reads cleanly on paper goes muddy on black. That is the very problem APCA, in the WCAG 3 draft, exists to fix. I did not implement APCA from memory (a wrong perceptual model is worse than none); I applied an empirical multiplier instead, so the criterion stays reproducible.

   | | light ground | dark ground |
   |---|---|---|
   | body `--wb-text` | ≥ 7 (AAA) / **13.85** | ≥ 13 / **15.05** |
   | secondary `--wb-muted` | ≥ 4.5 (AA) / **7.33** | ≥ 9 / **9.93** |
   | faint 11px `--wb-faint` | ≥ 4.5 / **5.18** | ≥ 7 / **7.75** |
   | accent on ground | ≥ 3 / **4.60** | ≥ 4.5 / **5.14** |
   | text on accent | ≥ 4.5 / **5.44** | ≥ 4.5 / **5.12** |
   | border visibility | ≥ 1.2 / **1.37** | ≥ 1.35 / **1.56** |

   All 19 variants (12 themes + 7 dark overrides) pass, and each text colour is checked against **every ground it actually lands on** — page, card, secondary, accent fill, masthead. The earlier audit only checked the page background and hid 11 failures. The measured figures are printed by `scripts/audit-contrast.mjs`, not transcribed by hand.
4. **Themes describe themselves.** Name, description, typeface and swatch live in each CSS file's header comment — drop a `.css` into `themes/` and it appears in the menu. No manifest to keep in sync.
5. **Palettes are generated** by `scripts/gen-themes.py`. Twelve hand-maintained files drift; one script does not. I specify hue and character only — the script pushes lightness until the contrast bar is met.
6. **Accents come in pairs, in two different hues.** Every theme carries `--wb-accent` and `--wb-accent-2`, and bars, columns and heatmaps render as two-hue gradients. The earlier second accent was just the first one lightened — two shades of one hue, which reads as almost no gradient at all, and that flatness was the main reason the palettes felt cheap. The pairings now come from traditional Chinese colour pairs (tea-brown × lotus-pink, inscribed-gold × bamboo-green, fisher-teal × green-plum, sky-cyan × goose-yellow, deep-azure × ten-brocade), separated by 26° to 176° of hue.

   素笺 is the deliberate exception: it can only reach the user's own Obsidian accent, and Obsidian's accent family is a single hue in several shades. Forcing a second hue in would stop it from following your theme.

### Switching

Theme names accept the Chinese name, the pinyin id, or the English name interchangeably.

```jsonc
// whole vault — _wb/config.json
{ "theme": "xuanzhi" }
```

```yaml
# one note — frontmatter
wbTheme: 松烟
```

Or the **🎨 Theme** button on the board (saved into that board's layout).

To nudge a colour without touching a theme file:

```jsonc
// _wb/config.json — injected inline, beats the theme's class rules
{ "tokens": { "accent": "#8B5CF6", "radius": "2px" } }
```

---

## Presets

An empty board shows preset cards directly; **⚡ Preset** brings them up any time (replacing the current layout, with a confirm step, and it's undoable). Reference: **[docs/presets.md](docs/presets.md)**.

| Preset | Contents | Theme |
|---|---|---|
| **Simple Start** | Greeting, quick actions, recent notes, tasks | — |
| **Knowledge Base** | Masthead, stats, spotlight, tags, hubs, orphans — 9 components | 朱砂 |
| **Planner** | Clock, daily note, calendar, due tasks — built around today | 素笺 |
| **Writing Desk** | Goals, output trend, work in progress | 秋毫 |

Presets are plain `_wb/presets/*.json` in the same format as a saved board. Add one and it shows up in the list. Coordinates don't need to be exact — the layout engine and auto-height pass run on apply.

---

## Roadmap

- [x] **M0** Runtime kernel, component contract, theme system
- [x] **M1** Visual board (drag / resize / add / remove / prop forms / theme switch / persistence) + 51 components
- [x] **M2** 12 themes with a contrast audit, 4 presets, undo
- [x] **M3** Reference docs, English README, release packaging
- [x] **M4** Shipped as an Obsidian plugin: ` ```workbench ` code block, ribbon icon, settings UI, **no Dataview dependency**

---

## Development

Preview components in a browser without opening Obsidian:

```bash
python -m http.server 8123
```

Then open `http://localhost:8123/dev/preview.html`. It stubs `dv` / `app` and a vault of fake notes, but runs the **real dispatcher**, so what you see is real behaviour. Four sections:

| Section | Purpose |
|---|---|
| **Board mode** | A live board: add, drag, resize, apply presets, switch themes, undo |
| **Font check** | Which font each stack actually resolves to **on this machine** (per-pixel detection, not guesswork) |
| **Theme wall** | All 12 themes side by side, light/dark toggle in the top bar |
| **Single components** | 51 components × 2 themes, plus deliberately broken cases to exercise error boundaries |

**Keep "Simulate Obsidian styles" on.** It injects Obsidian's global `button` / `input` / `ul` rules in the real load order. Obsidian gives `button` a fixed height, which silently breaks any component with multi-line block content inside a button — a class of bug that otherwise only shows up on real hardware.

Set `"dev": true` in `config.json` to skip the module cache while editing.

> Obsidian and the browser are both Chromium, so **font availability is identical** — what the font check reports here is what you'll get there.

### Generators

```bash
python scripts/gen-themes.py      # 12 theme CSS files
node   scripts/gen-docs.mjs       # docs/{components,themes,presets}.md
node   scripts/make-testvault.mjs # a test vault with 244 fake notes
node   scripts/build-release.mjs  # dist/*.zip
```

> On Windows, Node cannot launch a script from a path containing non-ASCII characters (it exits with code 9). Every script honours a `WB_ROOT` environment variable: copy the script somewhere ASCII, run it there, and point `WB_ROOT` back at the repo. File I/O on those paths is fine — only process launch is affected.

### Writing a component

`components/<id>/component.js` must be a **single expression** — one `(WB) => {...}` factory with nothing else around it (the file gets wrapped in `return (...)`). Put private helpers inside the factory body.

```js
(WB) => ({
  meta: {
    id: "hello",
    group: "layout",                       // which panel section it lands in
    name: { zh: "示例", en: "Hello" },
    desc: { zh: "一句话说明", en: "One-line description" },
    props: { who: { type: "text", default: "world", desc: "who to greet" } },
    layout: { w: 4, h: 3 },                // default grid footprint
    demo: { who: "Obsidian" },             // sample props for the gallery
  },
  render({ el, h, props, ui, q, link }) {
    el.appendChild(h("div.wb-hello", { text: `Hello, ${props.who}` }));
  },
})
```

Drop it in `components/hello/` and it **appears in the panel automatically** — there is no manifest to update.

- `group`: `header` / `nav` / `metrics` / `notes` / `tasks` / `layout`
- A sibling `style.css` is injected automatically
- Always use `--wb-*` variables for colour, **never literals** — that's the precondition for themes working at all
- Use `ui.noteList()` / `ui.bars()` / `ui.columns()` / `ui.chips()` for common layouts, so your component matches the rest
- Go through `q.*` (`q.pages` / `q.count` / `q.tasks` / `q.tallyByDay`) for data, never Dataview directly — swapping the data layer later should touch one file

---

## License

MIT
