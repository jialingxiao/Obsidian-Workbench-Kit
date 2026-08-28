/* core/astro.js · 历法计算（节气 / 朔望 / 农历）
 *
 * 节气和农历都要用同一套天文计算，所以放在内核里共用一份 —— 早先节气
 * 组件用的是「通用寿星公式」那种拟合近似，和这里的天文法在 2026 年雨水
 * 上就差了一天。与其维护两套精度不同的实现，不如只留精确的这套。
 *
 * 参考 Meeus《Astronomical Algorithms》第 49 章（朔望）、第 25 章（太阳位置）。
 * 验证脚本：scripts/verify-lunar.mjs —— 它加载的就是本文件，
 * 所以验证的是真正发布出去的代码，不是另一份副本。
 *
 * 所有「日期」一律按北京时（UTC+8）划分日界，这是农历的定义。
 */
(WB) => {
  const RAD = Math.PI / 180;
  const SYNODIC = 29.530588861;   // 朔望月平均长度

  /* ── 儒略日 ── */
  function toJD(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function fromJD(jd) {
    const Z = Math.floor(jd + 0.5);
    const F = jd + 0.5 - Z;
    let A = Z;
    if (Z >= 2299161) {
      const a = Math.floor((Z - 1867216.25) / 36524.25);
      A = Z + 1 + a - Math.floor(a / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);
    const day = B - D - Math.floor(30.6001 * E) + F;
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;
    return { y: year, m: month, d: Math.floor(day) };
  }

  /* ΔT：力学时 → 世界时。1900–2100 只有 60–70 秒，但恰好卡在午夜时会翻一天 */
  function deltaT(year) {
    const t = year - 2000;
    if (year >= 2005 && year <= 2050) return 62.92 + 0.32217 * t + 0.005589 * t * t;
    if (year > 2050) return -20 + 32 * Math.pow((year - 1820) / 100, 2) - 0.5628 * (2150 - year);
    const u = (year - 1900) / 100;
    return -2.79 + 149.4119 * u * 0.01;
  }
  const tdToUT = (jde, year) => jde - deltaT(year) / 86400;

  /* 北京时的「第几天」。农历以北京时划日界，不是 UTC。 */
  const dayNum = (jdUT) => Math.floor(jdUT + 0.5 + 8 / 24);
  const dayToDate = (d) => fromJD(d - 0.5);

  /* ── 第 k 个朔（新月）的力学时儒略日 ── */
  function newMoonJDE(k) {
    const T = k / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let jde = 2451550.09766 + SYNODIC * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;

    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const M  = (2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
    const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD;
    const F  = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD;
    const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;
    const s = Math.sin;

    jde += -0.40720 * s(Mp)
         + 0.17241 * E * s(M)
         + 0.01608 * s(2 * Mp)
         + 0.01039 * s(2 * F)
         + 0.00739 * E * s(Mp - M)
         - 0.00514 * E * s(Mp + M)
         + 0.00208 * E * E * s(2 * M)
         - 0.00111 * s(Mp - 2 * F)
         - 0.00057 * s(Mp + 2 * F)
         + 0.00056 * E * s(2 * Mp + M)
         - 0.00042 * s(3 * Mp)
         + 0.00042 * E * s(M + 2 * F)
         + 0.00038 * E * s(M - 2 * F)
         - 0.00024 * E * s(2 * Mp - M)
         - 0.00017 * s(Om)
         - 0.00007 * s(Mp + 2 * M)
         + 0.00004 * s(2 * Mp - 2 * F)
         + 0.00004 * s(3 * M)
         + 0.00003 * s(Mp + M - 2 * F)
         + 0.00003 * s(2 * Mp + 2 * F)
         - 0.00003 * s(Mp + M + 2 * F)
         + 0.00003 * s(Mp - M + 2 * F)
         - 0.00002 * s(Mp - M - 2 * F)
         - 0.00002 * s(3 * Mp + M)
         + 0.00002 * s(4 * Mp);

    /* 行星摄动：单项都不到 30 秒，但十几项叠起来能到一两分钟，
       恰好卡在午夜时会影响是哪一天，所以带上。 */
    const A = [
      [299.77,  0.107408, 0.000325, -0.009173],
      [251.88,  0.016321, 0.000165, 0],
      [251.83, 26.651886, 0.000164, 0],
      [349.42, 36.412478, 0.000126, 0],
      [ 84.66, 18.206239, 0.000110, 0],
      [141.74, 53.303771, 0.000062, 0],
      [207.14,  2.453732, 0.000060, 0],
      [154.84,  7.306860, 0.000056, 0],
      [ 34.52, 27.261239, 0.000047, 0],
      [207.19,  0.121824, 0.000042, 0],
      [291.34,  1.844379, 0.000040, 0],
      [161.72, 24.198154, 0.000037, 0],
      [239.56, 25.513099, 0.000035, 0],
      [331.55,  3.592518, 0.000023, 0],
    ];
    for (const [a0, a1, amp, a2] of A) jde += amp * s((a0 + a1 * k + a2 * T2) * RAD);
    return jde;
  }

  /* ── 太阳视黄经（度）── */
  function sunLongitude(jde) {
    const T = (jde - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
            + 0.000289 * Math.sin(3 * M);
    const Om = (125.04 - 1934.136 * T) * RAD;
    const app = L0 + C - 0.00569 - 0.00478 * Math.sin(Om);
    return ((app % 360) + 360) % 360;
  }

  /* 迭代求太阳黄经等于 target 的时刻 */
  function solarTermJDE(approxJDE, targetDeg) {
    let jd = approxJDE;
    for (let i = 0; i < 40; i++) {
      const diff = (((targetDeg - sunLongitude(jd) + 180) % 360) + 360) % 360 - 180;
      if (Math.abs(diff) < 1e-8) break;
      jd += diff * 365.2422 / 360;
    }
    return jd;
  }

  /* ── 24 节气 ──
   * i=0 小寒（黄经 285°），此后每 15° 一个。返回北京日序。 */
  const TERM_NAMES = [
    "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
    "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑",
    "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
  ];

  function termDay(year, i) {
    const deg = (285 + i * 15) % 360;
    const jde = solarTermJDE(toJD(year, Math.floor(i / 2) + 1, 15), deg);
    return dayNum(tdToUT(jde, year));
  }

  const winterSolsticeDay = (year) => dayNum(tdToUT(solarTermJDE(toJD(year, 12, 21.5), 270), year));

  /* 不晚于给定日序的那个朔的编号 */
  function newMoonKBefore(targetDay, year) {
    let k = Math.floor((targetDay - 2451550.09766) / SYNODIC) - 2;
    let best = k;
    for (let i = 0; i < 6; i++) {
      if (dayNum(tdToUT(newMoonJDE(k + i), year)) <= targetDay) best = k + i;
    }
    return best;
  }

  /* ── 排出某公历年前后的农历月序列 ──
   * 规则：含冬至的那个朔望月定为十一月；两个「十一月」之间若有 13 个月，
   * 则其中第一个不含中气的月为闰月，月号沿用前一个月。 */
  const yearCache = new Map();

  function buildYear(year) {
    if (yearCache.has(year)) return yearCache.get(year);

    const k1 = newMoonKBefore(winterSolsticeDay(year - 1), year - 1);
    const k2 = newMoonKBefore(winterSolsticeDay(year), year);
    const n = k2 - k1;

    const months = [];
    for (let i = 0; i <= n; i++) {
      const k = k1 + i;
      months.push({ k, start: dayNum(tdToUT(newMoonJDE(k), year)) });
    }
    for (let i = 0; i < months.length; i++) {
      months[i].end = i + 1 < months.length
        ? months[i + 1].start - 1
        : dayNum(tdToUT(newMoonJDE(months[i].k + 1), year)) - 1;
    }

    /* 中气 = 黄经每 30° 一个（冬至 270°、大寒 300°…）。
       月内有没有中气，决定它是不是闰月。 */
    const hasZhongQi = (m) => {
      for (let deg = 0; deg < 360; deg += 30) {
        const jde = solarTermJDE(m.start - 0.5 + 15, deg);
        const d = dayNum(tdToUT(jde, year));
        if (d >= m.start && d <= m.end) return true;
      }
      return false;
    };

    let leapIndex = -1;
    if (n === 13) {
      for (let i = 1; i < months.length; i++) {
        if (!hasZhongQi(months[i])) { leapIndex = i; break; }
      }
    }

    let num = 11;
    for (let i = 0; i < months.length; i++) {
      if (i === leapIndex) {
        months[i].num = months[i - 1].num;
        months[i].leap = true;
      } else {
        months[i].num = num;
        months[i].leap = false;
        num = (num % 12) + 1;
      }
    }
    yearCache.set(year, months);
    return months;
  }

  /* 公历日期 → 农历。返回 { month, day, leap, monthName, dayName } */
  const MONTH_NAME = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
  const DAY_TENS = ["初", "十", "廿", "卅"];
  const DAY_ONES = ["十", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  function dayName(d) {
    if (d === 10) return "初十";
    if (d === 20) return "二十";
    if (d === 30) return "三十";
    return DAY_TENS[Math.floor(d / 10)] + DAY_ONES[d % 10];
  }

  function toLunar(date) {
    const target = Math.floor(toJD(date.getFullYear(), date.getMonth() + 1, date.getDate()) + 0.5);
    // 目标日可能落在上一年排出的月序列里，两年都找
    for (const y of [date.getFullYear(), date.getFullYear() + 1]) {
      for (const m of buildYear(y)) {
        if (target >= m.start && target <= m.end) {
          const d = target - m.start + 1;
          return {
            month: m.num, day: d, leap: m.leap,
            monthName: (m.leap ? "闰" : "") + MONTH_NAME[m.num] + "月",
            dayName: dayName(d),
            monthStart: m.start, monthEnd: m.end,
          };
        }
      }
    }
    return null;
  }

  /* 干支与生肖。以立春为界还是以正月初一为界，历来有两派；
     这里用正月初一，和日常黄历一致。 */
  const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

  /* 某公历年的正月初一（春节）日序 */
  function springFestivalDay(year) {
    const m = buildYear(year).find((x) => x.num === 1 && !x.leap);
    return m ? m.start : null;
  }

  function ganzhiYear(date) {
    const sf = springFestivalDay(date.getFullYear());
    const target = Math.floor(toJD(date.getFullYear(), date.getMonth() + 1, date.getDate()) + 0.5);
    // 春节前算上一个农历年
    const y = sf != null && target < sf ? date.getFullYear() - 1 : date.getFullYear();
    const i = (y - 1984 + 6000) % 60;          // 1984 甲子
    return { gan: GAN[i % 10], zhi: ZHI[i % 12], zodiac: ZODIAC[i % 12], year: y };
  }

  return {
    toJD, fromJD, dayNum, dayToDate, sunLongitude, solarTermJDE, newMoonJDE,
    TERM_NAMES, termDay, winterSolsticeDay,
    buildYear, toLunar, springFestivalDay, ganzhiYear,
    MONTH_NAME, dayName,
  };
}
