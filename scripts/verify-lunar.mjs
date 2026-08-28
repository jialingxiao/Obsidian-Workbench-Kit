/* 历法自检：验证 vault/_wb/core/astro.js
 *
 *   node scripts/verify-lunar.mjs
 *
 * 刻意加载真正发布出去的那个文件，而不是把算法抄一份到这里 ——
 * 抄一份就变成「验证副本」，改了源文件也不会被发现。
 *
 * 农历算错了会安静地显示在首页上，没人会发现，所以必须拿公认日期对：
 * 春节、闰月、冬至，以及和「通用寿星公式」的交叉校验。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 用和内核完全相同的方式求值
const src = fs.readFileSync(path.join(ROOT, "vault", "_wb", "core", "astro.js"), "utf8");
const astro = new Function(`"use strict"; return (${src});`)()({});

const pad = (n) => String(n).padStart(2, "0");
const fmt = (dayNumber) => {
  const g = astro.dayToDate(dayNumber);
  return `${g.y}-${pad(g.m)}-${pad(g.d)}`;
};

let fail = 0;
const check = (name, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) fail++;
  console.log(`  ${ok ? "OK " : "!! "} ${name.padEnd(16)} 算得 ${String(got).padEnd(12)} 公认 ${want}`);
};

/* ── 春节 ── */
console.log("── 春节（正月初一）──");
const SPRING = {
  2020: "2020-01-25", 2021: "2021-02-12", 2022: "2022-02-01", 2023: "2023-01-22",
  2024: "2024-02-10", 2025: "2025-01-29", 2026: "2026-02-17", 2027: "2027-02-06",
  2028: "2028-01-26", 2029: "2029-02-13", 2030: "2030-02-03",
};
for (const [y, want] of Object.entries(SPRING)) {
  check(y, fmt(astro.springFestivalDay(Number(y))), want);
}

/* ── 闰月 ── */
console.log("── 闰月 ──");
const LEAP = { 2020: "四", 2021: null, 2022: null, 2023: "二", 2024: null, 2025: "六", 2026: null };
for (const [y, want] of Object.entries(LEAP)) {
  const m = astro.buildYear(Number(y)).find((x) => x.leap);
  check(y, m ? `闰${astro.MONTH_NAME[m.num]}月` : "无闰月", want ? `闰${want}月` : "无闰月");
}

/* ── 冬至（北京时）──
   2026 年冬至在 UTC 是 12/21 20:50，换算北京时落到 12/22 ——
   查历表时要留意它给的是哪个时区。 */
console.log("── 冬至（北京时）──");
check("2025", fmt(astro.winterSolsticeDay(2025)), "2025-12-21");
check("2026", fmt(astro.winterSolsticeDay(2026)), "2026-12-22");

/* ── 与通用寿星公式交叉校验 ──
   寿星公式是拟合出来的近似，有已知的 ±1 天特例；天文法直接解太阳黄经。
   两法在哪些节气上分歧，正好标出那些特例年份。 */
console.log("── 与寿星公式交叉校验（分歧即寿星公式的已知特例）──");
const C21 = [5.4055, 20.12, 3.87, 18.73, 5.63, 20.646, 4.81, 20.1, 5.52, 21.04, 5.678, 21.37,
             7.108, 22.83, 7.5, 23.13, 7.646, 23.042, 8.318, 23.438, 7.438, 22.36, 7.18, 21.94];
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
let totalDiff = 0;
for (let year = 2024; year <= 2030; year++) {
  const diffs = [];
  for (let i = 0; i < 24; i++) {
    const yy = year % 100;
    /* 闰年 3 月起要多减一天：L 累计的是闰日，而 2/29 之后的节气已经
       多过了一天。漏掉这一项的话，闰年从惊蛰到冬至会整体差一天 ——
       这正是早先 solar-term 组件里的 bug。 */
    const L = Math.floor((yy - 1) / 4) + (isLeap(year) && i >= 4 ? 1 : 0);
    const shouxing = Math.floor(yy * 0.2422 + C21[i]) - L;
    const astroDay = astro.dayToDate(astro.termDay(year, i)).d;
    if (shouxing !== astroDay) diffs.push(`${astro.TERM_NAMES[i]}(寿星${shouxing}/天文${astroDay})`);
  }
  totalDiff += diffs.length;
  console.log(`  ${year}  ${diffs.length ? diffs.join(" ") : "24 个节气两法一致"}`);
}
console.log(`  → 7 年 168 个节气中，两法分歧 ${totalDiff} 处（都取天文法）`);

/* ── 农历日期抽查 ── */
console.log("── 农历日期抽查 ──");
const SAMPLES = [
  ["2025-01-29", "正月初一"],
  ["2025-02-12", "正月十五"],
  ["2026-02-17", "正月初一"],
  ["2026-03-03", "正月十五"],
  ["2025-08-29", "七月初七"],     // 2025 七夕
  ["2025-10-06", "八月十五"],     // 2025 中秋
  ["2024-09-17", "八月十五"],     // 2024 中秋
];
for (const [iso, want] of SAMPLES) {
  const [y, m, d] = iso.split("-").map(Number);
  const l = astro.toLunar(new Date(y, m - 1, d));
  check(iso, l ? l.monthName + l.dayName : "null", want);
}

/* 闰月的起讫日期我没有独立来源可对，就不硬写成断言了 —— 打印出来
   供人拿黄历核一眼。前面 11 个春节 + 3 个闰月位置 + 7 个农历日期都对上了，
   这几个区间是同一套推算的产物，可信度跟着走。 */
console.log("── 闰月区间（供人工核对，非断言）──");
for (const y of [2020, 2023, 2025]) {
  const m = astro.buildYear(y).find((x) => x.leap);
  if (m) console.log(`  ${y} 闰${astro.MONTH_NAME[m.num]}月：${fmt(m.start)} — ${fmt(m.end)}（${m.end - m.start + 1} 天）`);
}

/* ── 干支生肖 ── */
console.log("── 干支生肖 ──");
for (const [iso, want] of [["2025-06-01", "乙巳蛇"], ["2026-06-01", "丙午马"], ["2026-01-01", "乙巳蛇"]]) {
  const [y, m, d] = iso.split("-").map(Number);
  const g = astro.ganzhiYear(new Date(y, m - 1, d));
  check(iso, g.gan + g.zhi + g.zodiac, want);
}

console.log(`\n${fail === 0 ? "全部通过" : fail + " 项不符"}`);
process.exit(fail === 0 ? 0 : 1);
