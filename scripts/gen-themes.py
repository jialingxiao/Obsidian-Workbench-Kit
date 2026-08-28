# 生成全部主题 CSS。
#
#   python scripts/gen-themes.py
#
# 设计方式：我只定「色相和气质」，明度由脚本推到对比度达标为止。
# 上一版是我肉眼挑十六进制，结果 10 套里有 6 套没过门槛，返工三轮；
# 而且 --wb-faint 用在 11px 小字上，却按大字号的 3:1 设计，实际读不动。
#
# 现在的规则：
#   text      ≥ 12    正文
#   muted     ≥ 6.5   次要文字（比 faint 明显强，层次才立得住）
#   faint     ≥ 4.6   弱化小字 —— 11px 属于小字号，必须按 4.5 算
#   accent    ≥ 3.2   对页底和卡片底都要够（它也当图形色用）
#   on-accent ≥ 4.6   压在强调色上的字
# 而且 muted / faint 取的是「仍然达标的最弱值」，层次最大化，
# 不会因为过度加深而糊成一片。
#
# 「单薄」的另一半是层次：页底 / 卡片 / 次级底之间必须有可见的明度差，
# 否则整页就是一张平面。上一版深色变体的差值只有 0.005，这版拉开。
# 另外每套主题都有第二强调色（--wb-accent-2），条形图和热力图用两色
# 渐变而不是单色叠透明度 —— 那是「单薄」最直接的来源。
#
# ── 配色来源 ──────────────────────────────────────────────────
# 强调色对取自一组中国传统色的两两配对。它们的价值不在单个颜色好看，
# 而在「配对」：两个色相不同、明度接近、饱和度都不高的颜色摆在一起。
# 之前我给每套主题的第二强调色是主强调色调亮一档 —— 同一个色相的深浅，
# 画成渐变几乎看不出变化，这正是「单薄」的来源。
#
#   茶色 #B35C44   藕荷色 #E4C6D0    铭金色 #E9CE77  竹子青 #789262
#   绿宝石 #5D8F67 萱草黄 #F39402    鱼师青 #277D93  青梅  #748F75
#   天青色 #85D4E3 鹅黄  #FEE883     绿茶  #B9D731  沉绿  #1F3028
#   十样锦 #FCC8B1 绀宇  #023C71     天水碧 #5AA4AE  凝脂  #F8F6EA
#
# 注意：原色不能直接当文字色用。铭金色压在米白纸上只有 1.3:1，
# 天青色压在白底上更糟。下面填进去的是原色，由 ensure_contrast 保持
# 色相与饱和度、只推明度到达标为止 —— 保留配对关系，牺牲的是明度。
import colorsys, io, os, sys

OUT = os.environ.get("WB_THEMES") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vault", "_wb", "themes")

# ── 颜色工具 ──────────────────────────────────────────────────
def h2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

def rgb2h(rgb):
    return "#%02X%02X%02X" % tuple(max(0, min(255, round(c * 255))) for c in rgb)

def lum(h):
    def f(v):
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(c) for c in h2rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def mix(a, b, t):
    ra, rb = h2rgb(a), h2rgb(b)
    return rgb2h(tuple(ra[i] + (rb[i] - ra[i]) * t for i in range(3)))

def weakest_passing(ink, backgrounds, target, start):
    """从底色出发向 ink 靠，取第一个对所有底色都达标的颜色。
       结果是「仍然合格的最弱值」—— 层次最大，又不会读不动。"""
    for i in range(0, 301):
        c = mix(start, ink, i / 300)
        if all(contrast(c, bg) >= target for bg in backgrounds):
            return c
    return ink

def ensure_contrast(color, backgrounds, target, toward):
    """保持色相与饱和度，只推明度，直到对所有底色达标。"""
    hh, ll, ss = colorsys.rgb_to_hls(*h2rgb(color))
    step = -0.004 if toward == "dark" else 0.004
    for i in range(0, 250):
        c = rgb2h(colorsys.hls_to_rgb(hh, max(0.0, min(1.0, ll + step * i)), ss))
        if all(contrast(c, bg) >= target for bg in backgrounds):
            return c
    return color

def pick_on(accent, ink, paper, target=4.6):
    """强调色上的字用墨还是用纸：谁对比度高用谁；都不够就把强调色推深。"""
    ci, cp = contrast(ink, accent), contrast(paper, accent)
    if max(ci, cp) >= target:
        return (ink if ci >= cp else paper), accent
    deeper = ensure_contrast(accent, [paper], target, "dark")
    return paper, deeper

# ── 字体族（引用 base.css 里的共用变量）────────────────────────
F = {
    "system": "var(--wb-f-system)",
    "song":   "var(--wb-f-song)",
    "kai":    "var(--wb-f-kai)",
    "hei":    "var(--wb-f-hei)",
    "yuan":   "var(--wb-f-yuan)",
    "serif":  "var(--wb-f-serif)",
    "georgia": 'Georgia, "Times New Roman", var(--wb-f-song)',
    "mono":   "var(--wb-f-mono)",
}

HDR = """/* ============================================================
   主题 · {name}（{eid}）
   @name {name}
   @en {en}
   @desc {desc}
   @font {font}
   @swatch {swatch}
   ------------------------------------------------------------
   本文件由 scripts/gen-themes.py 生成，改配色请改脚本。
   muted / faint / on-accent 的明度由脚本推算，保证对比度达标；
   自检见 scripts/audit-contrast.mjs。
   ============================================================ */
"""

ORDER = ["bg", "surface", "surface-2", "border", "rule",
         "text", "muted", "faint",
         "accent", "accent-2", "on-accent", "success", "danger", "heat-empty",
         "mast-bg", "mast-text", "mast-dim",
         "radius", "radius-sm", "gap", "pad",
         "font", "font-display", "font-mono",
         "title-size", "title-weight", "title-track", "shadow"]


def is_dark(c):
    return lum(c) < 0.15


def build(s):
    """把「色相与气质」推算成一整套达标的 token。

    门槛按底色明暗分开：WCAG 2 的比值在深色底上系统性高估可读性 ——
    同样 4.6:1，浅底上的灰字清楚，深底上的灰字发糊。上一版两边同槛，
    结果 10 套深色变体的次要文字全都偏暗。深底这一侧统一乘约 1.5。"""
    bg, sf, s2 = s["bg"], s["surface"], s["surface2"]
    ink, paper = s["ink"], s["paper"]
    backgrounds = [bg, sf, s2]
    dark = is_dark(bg)

    t_text   = 13  if dark else 12
    t_muted  = 9   if dark else 6.5
    t_faint  = 7   if dark else 4.6
    t_accent = 4.5 if dark else 3.2
    t_state  = 7   if dark else 4.6

    text = ensure_contrast(s.get("text", ink), backgrounds, t_text, s["dir"])
    muted = weakest_passing(text, backgrounds, t_muted, bg)
    faint = weakest_passing(text, backgrounds, t_faint, bg)

    accent = ensure_contrast(s["accent"], [bg, sf], t_accent, s["dir"])
    # seal（印章）把页底色当「白文」印在强调色的实心块上，所以强调色
    # 对页底还得再够一档 —— 3.2 只够保证它当图形色看得见，当字底不够。
    # 鱼师青、竹子青这类中明度的传统色，正好卡在这条线上。
    accent = ensure_contrast(accent, [bg], 4.6, s["dir"])
    on_accent, accent = pick_on(accent, ink, paper)
    accent2 = ensure_contrast(s["accent2"], [bg, sf], t_accent - 0.2, s["dir"])

    success = ensure_contrast(s["success"], backgrounds, t_state, s["dir"])
    danger = ensure_contrast(s["danger"], backgrounds, t_state, s["dir"])

    # 报头底永远是深色，所以报头小字一律按深色门槛算 ——
    # 上一版按 4.6 推，结果那行小字是全页最暗的文字。
    mast_bg = s["mast_bg"]
    mast_text = ensure_contrast(s.get("mast_text", paper), [mast_bg], 13, "light")
    mast_dim = weakest_passing(mast_text, [mast_bg], 7, mast_bg)

    return {
        "bg": bg, "surface": sf, "surface-2": s2,
        "border": s["border"], "rule": s.get("rule", text),
        "text": text, "muted": muted, "faint": faint,
        "accent": accent, "accent-2": accent2, "on-accent": on_accent,
        "success": success, "danger": danger,
        "heat-empty": s.get("heat_empty", s2),
        "mast-bg": mast_bg, "mast-text": mast_text, "mast-dim": mast_dim,
        "radius": s["radius"], "radius-sm": s["radius_sm"],
        "gap": s.get("gap", "14px"), "pad": s.get("pad", "18px"),
        "font": s["font"], "font-display": s["font_display"], "font-mono": F["mono"],
        "title-size": s["title_size"], "title-weight": s["title_weight"],
        "title-track": s["title_track"], "shadow": s["shadow"],
    }


DARK_KEYS = ["bg", "surface", "surface-2", "border", "rule", "text", "muted", "faint",
             "accent", "accent-2", "on-accent", "success", "danger", "heat-empty",
             "mast-bg", "mast-text", "mast-dim"]

def dark_of(spec):
    """深色覆写也走同一套推算，不再手写 —— 上一版手写的深色块
       正是「on-accent 忘了改」和「层次差 0.005」的来源。"""
    t = build(spec)
    return {k: t[k] for k in DARK_KEYS}


def emit(eid, name, en, desc, font_label, tokens, extra="", dark=None):
    swatch = "%s %s %s" % (tokens["bg"], tokens["text"], tokens["accent"])
    css = HDR.format(name=name, eid=eid, en=en, desc=desc, font=font_label, swatch=swatch)
    body = "".join("  --wb-%s:%s%s;\n" % (k, " " * max(1, 15 - len(k)), tokens[k])
                   for k in ORDER if k in tokens)
    css += ".wb.wb-theme-%s {\n%s}\n" % (eid, body)
    if dark:
        db = "".join("  --wb-%s:%s%s;\n" % (k, " " * max(1, 15 - len(k)), v) for k, v in dark.items())
        css += "\n/* 深色模式：底色整体压暗，但保留这套主题的色相关系。\n"
        css += "   取值同样由脚本推算，不手写。 */\n"
        css += ".theme-dark .wb.wb-theme-%s {\n%s}\n" % (eid, db)
    css += extra
    io.open(os.path.join(OUT, eid + ".css"), "w", encoding="utf-8", newline="\n").write(css)
    print("  " + eid.ljust(10) + name)


if not os.path.isdir(OUT):
    sys.exit("找不到主题目录：" + OUT)
print("生成主题 →", OUT)

# ══ 1. 素笺 · 跟随 Obsidian ════════════════════════════════════
# 这套刻意全用原生变量，取值由用户的 Obsidian 主题决定。
# 唯一的干预：faint 改用 --text-muted —— Obsidian 默认的 --text-faint
# 在白底上只有 2.85，11px 小字根本读不动。宁可少一级层次，也不能看不清。
emit("sujian", "素笺", "Plain Letter",
     "不喧宾夺主，完全跟随你的 Obsidian 主题与明暗模式", "系统界面字体",
     {
        "bg": "var(--background-primary)", "surface": "var(--background-secondary)",
        "surface-2": "var(--background-secondary-alt)", "border": "var(--background-modifier-border)",
        "rule": "var(--background-modifier-border)",
        "text": "var(--text-normal)", "muted": "var(--text-muted)", "faint": "var(--text-muted)",
        "accent": "var(--interactive-accent)",
        # 别的主题这里是另一个色相，图表才有两色渐变；素笺只能拿到用户
        # Obsidian 的强调色，而 Obsidian 的 accent 家族全是同一色相的深浅。
        # 硬塞一个色相进去就不叫「跟随你的主题」了 —— 这套单色是故意的。
        "accent-2": "var(--text-accent-hover, var(--interactive-accent))",
        "on-accent": "var(--text-on-accent)",
        "success": "var(--color-green)", "danger": "var(--color-red)",
        "heat-empty": "var(--background-modifier-border)",
        "mast-bg": "var(--background-secondary)", "mast-text": "var(--text-normal)",
        "mast-dim": "var(--text-muted)",
        "radius": "10px", "radius-sm": "6px", "gap": "14px", "pad": "18px",
        "font": F["system"], "font-display": F["system"], "font-mono": F["mono"],
        "title-size": "2.0em", "title-weight": "650", "title-track": "-0.01em",
        "shadow": "0 1px 2px rgba(0,0,0,.06)",
     })

# ══ 2. 宣纸 ════════════════════════════════════════════════════
emit("xuanzhi", "宣纸", "Xuan Paper",
     "米白纸面配墨黑宋体，朱砂点题，像一页刚写完的稿纸", "宋体",
     build(dict(dir="dark", bg="#F4EFE2", surface="#FCFAF4", surface2="#E6DDC7",
                border="#D6CAAE", ink="#1B1712", paper="#FDFBF5", text="#1B1712",
                accent="#A62B20", accent2="#E9CE77", success="#3F6B45", danger="#A62B20",
                mast_bg="#221C15", radius="4px", radius_sm="2px", pad="20px",
                font=F["song"], font_display=F["song"],
                title_size="2.8em", title_weight="700", title_track="0.02em",
                shadow="0 1px 3px rgba(60,45,20,.10)")),
     extra="""
/* 极淡的横向纸纹 —— 1.2% 的黑，凑近才看得见，远看只觉得纸不是死平的 */
.wb.wb-theme-xuanzhi .wb-grid {
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,.012) 0 1px, transparent 1px 4px);
}
.wb.wb-theme-xuanzhi .wb-head { border-bottom: 1px solid var(--wb-border); padding-bottom: 4px; }
.wb.wb-theme-xuanzhi .wb-head-label { letter-spacing: .3em; }
""",
     dark=dark_of(dict(dir="light", bg="#181510", surface="#1E1A14", surface2="#241F18",
                       border="#463D2D", ink="#100E0A", paper="#F0EADB", text="#F0EADB",
                       accent="#D4685A", accent2="#E9CE77", success="#7FB07F", danger="#E0796B",
                       mast_bg="#100E0A", radius="4px", radius_sm="2px",
                       font=F["song"], font_display=F["song"],
                       title_size="2.8em", title_weight="700", title_track="0.02em",
                       shadow="none")))

# ══ 3. 水墨 ════════════════════════════════════════════════════
emit("shuimo", "水墨", "Ink Wash",
     "冷灰纸上浓淡两级墨色，标题用楷体，留白多过着墨", "楷体标题 + 黑体正文",
     build(dict(dir="dark", bg="#EBEFEE", surface="#FBFCFC", surface2="#DAE0DF",
                border="#C2CBC9", ink="#14181B", paper="#FAFBFB", text="#14181B",
                accent="#2E4550", accent2="#748F75", success="#3D6B4C", danger="#9B3B33",
                mast_bg="#1A1F23", radius="2px", radius_sm="1px", gap="16px", pad="20px",
                font=F["hei"], font_display=F["kai"],
                title_size="3.0em", title_weight="400", title_track="0.06em",
                shadow="0 1px 3px rgba(20,30,35,.10)")),
     extra="""
/* 水墨讲究留白：标题细、字距开，分区线只用一道极淡的灰。
   楷体只用在标题 —— 长段正文用楷体在屏幕上很难读。 */
.wb.wb-theme-shuimo .wb-head { border-bottom: 1px solid var(--wb-border); padding-bottom: 6px; }
.wb.wb-theme-shuimo .wb-head-label { font-weight: 400; letter-spacing: .34em; }
""",
     dark=dark_of(dict(dir="light", bg="#131719", surface="#181D20", surface2="#1E2427",
                       border="#3F494E", ink="#0D1012", paper="#E9EDEC", text="#E9EDEC",
                       accent="#9FB6C2", accent2="#748F75", success="#7DB08C", danger="#DE7A72",
                       mast_bg="#0D1012", radius="2px", radius_sm="1px",
                       font=F["hei"], font_display=F["kai"],
                       title_size="3.0em", title_weight="400", title_track="0.06em",
                       shadow="none")))

# ══ 4. 朱砂 ════════════════════════════════════════════════════
emit("zhusha", "朱砂", "Cinnabar",
     "黑红杂志排版，粗标题配朱红，最有个性的一套", "衬线标题（Playfair / 宋体）",
     build(dict(dir="dark", bg="#F0ECE3", surface="#FFFFFF", surface2="#E0D8C8",
                border="#CEC4B0", ink="#101010", paper="#FFFFFF", text="#101010",
                accent="#AE1330", accent2="#E9CE77", success="#33693F", danger="#AE1330",
                mast_bg="#0F0F0F", radius="3px", radius_sm="2px", pad="20px",
                font=F["hei"], font_display=F["serif"],
                title_size="3.2em", title_weight="900", title_track="-0.03em",
                shadow="0 1px 3px rgba(0,0,0,.10)")),
     extra="""
/* 杂志风的签名细节：分区标题压一道粗黑线 */
.wb.wb-theme-zhusha .wb-head { border-bottom: 2px solid var(--wb-rule); padding-bottom: 5px; }
""",
     dark=dark_of(dict(dir="light", bg="#131110", surface="#191614", surface2="#1F1B18",
                       border="#443D33", ink="#0A0908", paper="#F2EEE5", text="#F2EEE5",
                       accent="#E8556B", accent2="#E9CE77", success="#79B187", danger="#E8556B",
                       mast_bg="#0A0908", radius="3px", radius_sm="2px",
                       font=F["hei"], font_display=F["serif"],
                       title_size="3.2em", title_weight="900", title_track="-0.03em",
                       shadow="none")))

# ══ 5. 青瓷 ════════════════════════════════════════════════════
emit("qingci", "青瓷", "Celadon",
     "青白釉色打底，鱼师青配青梅，温润不抢眼", "宋体",
     build(dict(dir="dark", bg="#EAF1EF", surface="#FBFDFC", surface2="#D6E4DF",
                border="#BFD3CB", ink="#0F2624", paper="#F9FDFB", text="#0F2624",
                accent="#277D93", accent2="#748F75", success="#2F6B54", danger="#A3453B",
                mast_bg="#153531", radius="12px", radius_sm="7px",
                font=F["song"], font_display=F["song"],
                title_size="2.5em", title_weight="700", title_track="0.01em",
                shadow="0 1px 3px rgba(20,60,55,.10)")),
     extra="""
/* 瓷器的圆润感靠大圆角；分区线用釉色而不是黑 */
.wb.wb-theme-qingci .wb-head { border-bottom: 1px solid var(--wb-accent); padding-bottom: 4px; }
""",
     dark=dark_of(dict(dir="light", bg="#0E1615", surface="#131C1B", surface2="#182220",
                       border="#2E403C", ink="#0A1211", paper="#E4EFEB", text="#E4EFEB",
                       accent="#5AA4AE", accent2="#748F75", success="#68B6A2", danger="#DE7E72",
                       mast_bg="#0A1211", radius="12px", radius_sm="7px",
                       font=F["song"], font_display=F["song"],
                       title_size="2.5em", title_weight="700", title_track="0.01em",
                       shadow="none")))

# ══ 6. 秋毫 ════════════════════════════════════════════════════
emit("qiuhao", "秋毫", "Autumn Brush",
     "奶油纸配金褐，衬线字，像一本摊开的手稿本", "Georgia 衬线",
     build(dict(dir="dark", bg="#F6F0E2", surface="#FFFCF4", surface2="#E8DDC4",
                border="#D6C9A9", ink="#191510", paper="#FFFDF6", text="#191510",
                accent="#8A5F12", accent2="#B35C44", success="#3F6B45", danger="#A8412F",
                mast_bg="#1B1813", radius="6px", radius_sm="3px", pad="20px",
                font=F["georgia"], font_display=F["georgia"],
                title_size="2.6em", title_weight="700", title_track="-0.015em",
                shadow="0 1px 3px rgba(70,55,20,.10)")),
     extra="""
/* 手稿感：分区标题用小写斜体，不做全大写 + 字母间距那一套 */
.wb.wb-theme-qiuhao .wb-head-label {
  font-family: var(--wb-font-display);
  font-style: italic; font-size: var(--wb-fs-sm); font-weight: 600;
  letter-spacing: .02em; text-transform: none; color: var(--wb-text);
}
.wb.wb-theme-qiuhao .wb-head { border-bottom: 1px solid var(--wb-border); padding-bottom: 4px; }
""",
     dark=dark_of(dict(dir="light", bg="#171511", surface="#1D1A15", surface2="#231F19",
                       border="#453C2E", ink="#100E0A", paper="#EFE9DA", text="#EFE9DA",
                       accent="#D8B25C", accent2="#B35C44", success="#7FB07F", danger="#DE8570",
                       mast_bg="#100E0A", radius="6px", radius_sm="3px",
                       font=F["georgia"], font_display=F["georgia"],
                       title_size="2.6em", title_weight="700", title_track="-0.015em",
                       shadow="none")))

# ══ 7. 竹影 ════════════════════════════════════════════════════
emit("zhuying", "竹影", "Bamboo Shade",
     "浅豆青底配竹子青，铭金点缀，圆体字清爽轻快", "圆体",
     build(dict(dir="dark", bg="#EDF3E4", surface="#FBFDF7", surface2="#DAE6C9",
                border="#C4D4AE", ink="#18260F", paper="#FAFDF5", text="#18260F",
                accent="#789262", accent2="#E9CE77", success="#3A6B1E", danger="#A8482F",
                mast_bg="#1F2E15", radius="14px", radius_sm="8px", gap="12px",
                font=F["yuan"], font_display=F["yuan"],
                title_size="2.3em", title_weight="700", title_track="0.01em",
                shadow="0 1px 3px rgba(35,60,20,.10)")),
     extra="""
.wb.wb-theme-zhuying .wb-head-label { letter-spacing: .18em; }
""",
     dark=dark_of(dict(dir="light", bg="#10150C", surface="#151B10", surface2="#1A2215",
                       border="#374527", ink="#0B0F08", paper="#E7EEDC", text="#E7EEDC",
                       accent="#789262", accent2="#E9CE77", success="#8DC463", danger="#DE8570",
                       mast_bg="#0B0F08", radius="14px", radius_sm="8px", gap="12px",
                       font=F["yuan"], font_display=F["yuan"],
                       title_size="2.3em", title_weight="700", title_track="0.01em",
                       shadow="none")))

# ══ 8. 松烟（认定深色）════════════════════════════════════════
emit("songyan", "松烟", "Pine Soot",
     "松烟墨的深底配金褐，深色里少见的宋体，沉静耐看", "宋体（深色）",
     build(dict(dir="light", bg="#121514", surface="#171B19", surface2="#1D211F",
                border="#3D443F", ink="#0E100F", paper="#ECEFEA", text="#ECEFEA",
                accent="#D2BC88", accent2="#789262", success="#7FB087", danger="#DD8272",
                mast_bg="#0E100F", radius="4px", radius_sm="2px", pad="20px",
                font=F["song"], font_display=F["song"],
                title_size="2.7em", title_weight="700", title_track="0.03em",
                shadow="0 2px 6px rgba(0,0,0,.35)")),
     extra="""
/* 这套认定了要深色：浅色模式下打开也照样是深色，没有 .theme-dark 覆写 —— 刻意的。
   深底上纯靠边框分不出层次，所以给块加实底和投影。 */
.wb.wb-theme-songyan .wb-blk {
  background: var(--wb-surface);
  border: 1px solid var(--wb-border);
  box-shadow: var(--wb-shadow);
}
.wb.wb-theme-songyan .wb-blk-body { padding: 12px 14px; }
.wb.wb-theme-songyan .wb-head { border-bottom: 1px solid var(--wb-border); padding-bottom: 5px; }
.wb.wb-theme-songyan .wb-head-label { letter-spacing: .28em; color: var(--wb-accent); }
""")

# ══ 9. 靛蓝（认定深色）════════════════════════════════════════
emit("dianlan", "靛蓝", "Indigo",
     "深靛底配月白字，天青与鹅黄点题，夜里看最舒服的一套", "黑体（深色）",
     build(dict(dir="light", bg="#0C121C", surface="#111926", surface2="#16202F",
                border="#2C3B52", ink="#0A0F17", paper="#E7EDF6", text="#E7EDF6",
                accent="#85D4E3", accent2="#FEE883", success="#5FBE93", danger="#EC7183",
                mast_bg="#0A0F17", radius="10px", radius_sm="6px",
                font=F["hei"], font_display=F["hei"],
                title_size="2.3em", title_weight="700", title_track="-0.01em",
                shadow="0 2px 6px rgba(0,0,0,.40)")),
     extra="""
.wb.wb-theme-dianlan .wb-blk {
  background: var(--wb-surface);
  border: 1px solid var(--wb-border);
  box-shadow: var(--wb-shadow);
}
.wb.wb-theme-dianlan .wb-blk-body { padding: 12px 14px; }
.wb.wb-theme-dianlan .wb-head-label { color: var(--wb-faint); }
""")

# ══ 10. 曜石（认定深色 · 仪表盘）══════════════════════════════
emit("yaoshi", "曜石", "Obsidian Glass",
     "近黑底配电光蓝，块有实底和投影，仪表盘的观感", "黑体（深色）",
     build(dict(dir="light", bg="#0B0E13", surface="#10141A", surface2="#151A22",
                border="#2D3540", ink="#070A0D", paper="#E9ECF2", text="#E9ECF2",
                accent="#54A3FF", accent2="#F39402", success="#46C46E", danger="#FF6B78",
                mast_bg="#070A0D", radius="10px", radius_sm="6px", gap="12px",
                font=F["hei"], font_display=F["hei"],
                title_size="2.2em", title_weight="700", title_track="-0.02em",
                shadow="0 2px 8px rgba(0,0,0,.45)")),
     extra="""
/* 仪表盘观感的来源：块有实底和投影，在深底上才分得出层次。 */
.wb.wb-theme-yaoshi .wb-blk {
  background: var(--wb-surface);
  border: 1px solid var(--wb-border);
  box-shadow: var(--wb-shadow);
}
.wb.wb-theme-yaoshi .wb-blk-body { padding: 12px 14px; }
.wb.wb-theme-yaoshi.is-editing .wb-blk-bar {
  background: var(--wb-surface-2);
  border-radius: calc(var(--wb-radius) - 1px) calc(var(--wb-radius) - 1px) 0 0;
}
.wb.wb-theme-yaoshi .wb-head-label { color: var(--wb-faint); }
""")


# ══ 11. 绀宇 ══════════════════════════════════════════════════
# 十样锦 #FCC8B1 + 绀宇 #023C71：暖粉底压深蓝字。
# 前面十套的底色不是白纸就是黑夜，没有一套是「有颜色的浅底」——
# 这一套补的就是那个空位。粉底直接用 #FCC8B1 会太艳，往白里退两档
# 当页底，原色留给次级底和边框，浓度还在。
emit("ganyu", "绀宇", "Deep Azure",
     "十样锦的暖粉纸压绀青深蓝，冷暖对冲，像一幅工笔设色", "黑体正文 + 宋体标题",
     build(dict(dir="dark", bg="#F7E9DE", surface="#FFFAF6", surface2="#F4DACA",
                border="#E3C2AD", ink="#08192B", paper="#FFFBF8", text="#08192B",
                accent="#023C71", accent2="#B35C44", success="#2F6B54", danger="#A8412F",
                mast_bg="#04203C", radius="8px", radius_sm="4px", pad="20px",
                font=F["hei"], font_display=F["song"],
                title_size="2.6em", title_weight="700", title_track="0.01em",
                shadow="0 1px 3px rgba(70,40,25,.12)")),
     extra="""
/* 冷暖对冲是这套的全部：标题下的线用绀青，压在暖粉纸上最亮眼 */
.wb.wb-theme-ganyu .wb-head { border-bottom: 1px solid var(--wb-accent); padding-bottom: 4px; }
.wb.wb-theme-ganyu .wb-head-label { letter-spacing: .2em; color: var(--wb-accent); }
""",
     # 深色模式把两个颜色的角色对调：粉底压蓝字 → 蓝底衬粉字。
     # 参考图本身就是这么排的，一半绀宇一半十样锦。
     dark=dark_of(dict(dir="light", bg="#0A1119", surface="#0F1722", surface2="#141D29",
                       border="#2A3A50", ink="#060B12", paper="#F7E4D8", text="#F7E4D8",
                       accent="#FCC8B1", accent2="#7FB2E8", success="#7CC49A", danger="#E88A78",
                       mast_bg="#060B12", radius="8px", radius_sm="4px",
                       font=F["hei"], font_display=F["song"],
                       title_size="2.6em", title_weight="700", title_track="0.01em",
                       shadow="none")))

# ══ 12. 沉绿（认定深色）══════════════════════════════════════
# 沉绿 #1F3028 + 绿茶 #B9D731：整套里唯一敢用高饱和亮色的。
#
# 沉绿原色当不了卡片底：它的相对亮度 0.026，正文压在上面顶多 11.8:1，
# 连纯白都只有 12.5:1，过不了深色底 13:1 那条线。所以整摞底色往下压一档，
# 原色留给热力图的空格 —— 那是整页上这个颜色面积最大的地方。
emit("chenlv", "沉绿", "Deep Green",
     "沉绿夜底上一点绿茶色，是这套里最有精神的深色", "圆体（深色）",
     build(dict(dir="light", bg="#101814", surface="#15201A", surface2="#1B2620",
                border="#375044", heat_empty="#1F3028",
                ink="#0E1713", paper="#E7EFE3", text="#E7EFE3",
                accent="#B9D731", accent2="#5AA4AE", success="#7FC08A", danger="#E4795F",
                mast_bg="#0E1713", radius="12px", radius_sm="7px", gap="12px",
                font=F["yuan"], font_display=F["yuan"],
                title_size="2.4em", title_weight="700", title_track="0.01em",
                shadow="0 2px 7px rgba(0,0,0,.40)")),
     extra="""
/* 和松烟/靛蓝/曜石一样：深底靠实底 + 边框 + 投影分层，不靠明度阶 */
.wb.wb-theme-chenlv .wb-blk {
  background: var(--wb-surface);
  border: 1px solid var(--wb-border);
  box-shadow: var(--wb-shadow);
}
.wb.wb-theme-chenlv .wb-blk-body { padding: 12px 14px; }
.wb.wb-theme-chenlv .wb-head-label { color: var(--wb-accent); letter-spacing: .16em; }
""")

print("完成：12 套主题")
