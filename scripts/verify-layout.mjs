/* 布局算法自检
 *
 *   node scripts/verify-layout.mjs
 *
 * 加载的是真正发布的 core/board.js，不是抄一份。
 *
 * 为什么要有这个：布局到今天已经出过三次 bug，而且每次都是「本地看着还行、
 * 用户拖起来不对」——
 *   1. 只上浮不下沉，两个块同时停在 y=0 互相重叠
 *   2. 缩放沿用 place()，被改的块自己往上跑
 *   3. 拖动时被拖的块抢到最高上浮优先级，往下拖反而飞到顶上
 * 这些都是坐标层面的性质，用不着浏览器，纯函数直接断言最快也最准。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.WB_ROOT
  ? path.resolve(process.env.WB_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const src = fs.readFileSync(path.join(ROOT, "vault", "_wb", "core", "board.js"), "utf8");
const board = new Function("return (" + src + ")")()({ dom: {}, runtime: {}, store: {}, editor: {} });

const COLS = 24;
let fails = 0;
const show = (l) => l.map((b) => `${b.id}(x${b.x},y${b.y},${b.w}x${b.h})`).join(" ");

function check(name, cond, detail) {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${detail ? "   " + detail : ""}`);
  if (!cond) fails++;
}
const at = (list, id) => list.find((b) => b.id === id);
const overlaps = (l) => l.some((a, i) => l.slice(i + 1).some((b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));

console.log("── 拖动（place）──");
{
  /* 报头占满整宽在最上面，下面并排两块。把右边那块往下拖。 */
  const blocks = [
    { id: "head", x: 0,  y: 0, w: 24, h: 8 },
    { id: "left", x: 0,  y: 8, w: 12, h: 10 },
    { id: "right", x: 12, y: 8, w: 12, h: 10 },
  ];
  const out = board.place(blocks, { ...at(blocks, "right"), y: 30 }, COLS);
  check("报头仍在最顶上（不被后拖的块顶下去）", at(out, "head").y === 0,
        `head.y=${at(out, "head").y}`);
  check("被拖的块落在报头下方，不会飞到顶上", at(out, "right").y >= 8,
        `right.y=${at(out, "right").y}`);
  check("没有重叠", !overlaps(out), show(out));
}
{
  /* 往上拖：应当尊重意图，落到最上面 */
  const blocks = [
    { id: "a", x: 0, y: 0,  w: 12, h: 6 },
    { id: "b", x: 0, y: 20, w: 12, h: 6 },
  ];
  const out = board.place(blocks, { ...at(blocks, "b"), x: 12, y: 0 }, COLS);
  check("往空位上拖，确实能到顶", at(out, "b").y === 0, `b=(x${at(out,"b").x},y${at(out,"b").y})`);
  check("没有重叠", !overlaps(out), show(out));
}
{
  /* 拖到同一列的下方：不能穿过上面那块 */
  const blocks = [
    { id: "a", x: 0, y: 0, w: 12, h: 10 },
    { id: "b", x: 0, y: 10, w: 12, h: 10 },
  ];
  const out = board.place(blocks, { ...at(blocks, "b"), y: 40 }, COLS);
  check("同列往下拖，仍在上面那块之下", at(out, "b").y >= at(out, "a").y + at(out, "a").h,
        `a.y=${at(out,"a").y} b.y=${at(out,"b").y}`);
}

console.log("");
console.log("── 上下对称与交换 ──");
{
  /* 反馈：「向上拖动比较灵敏，向下拖动总是出错。」
     根因是让位只会往下推（b.y++）：向上拖时下面的块顺势下移看着自然，
     向下拖时被压住的块被推得更靠下，而你腾出来的空白没人填。
     现在上下各找最近的落点，于是两个方向都变成「交换位置」。 */
  const F = { float: true };
  const pair = () => [
    { id: "a", x: 0, y: 0, w: 12, h: 6 },
    { id: "b", x: 0, y: 6, w: 12, h: 6 },
  ];
  {
    const out = board.place(pair(), { ...at(pair(), "a"), y: 6 }, COLS, F);
    check("向下拖到对方身上 → 两块交换，不是把对方推得更远",
          at(out, "a").y === 6 && at(out, "b").y === 0,
          `a.y=${at(out, "a").y} b.y=${at(out, "b").y}`);
  }
  {
    const out = board.place(pair(), { ...at(pair(), "b"), y: 0 }, COLS, F);
    check("向上拖到对方身上 → 同样是交换",
          at(out, "b").y === 0 && at(out, "a").y === 6,
          `b.y=${at(out, "b").y} a.y=${at(out, "a").y}`);
  }
  {
    const blocks = [
      { id: "a", x: 0, y: 0,  w: 12, h: 6 },
      { id: "b", x: 0, y: 6,  w: 12, h: 6 },
      { id: "c", x: 0, y: 12, w: 12, h: 6 },
    ];
    const before = Math.max(...blocks.map((b) => b.y + b.h));
    const out = board.place(blocks, { ...at(blocks, "a"), y: 6 }, COLS, F);
    const after = Math.max(...out.map((b) => b.y + b.h));
    check("向下拖不会把板子越拖越长", after <= before, `${before} 行 → ${after} 行`);
    check("没有重叠", !overlaps(out), show(out));
  }
  {
    /* editor 松手时喂的是「你拖到的那一格」，不是算完的结果。这里锁住确定性。 */
    const blocks = pair();
    const once = board.place(blocks, { ...at(blocks, "a"), y: 20 }, COLS, F);
    const again = board.place(blocks, { ...at(blocks, "a"), y: 20 }, COLS, F);
    check("同样的输入两次结果相同（确定性）",
          JSON.stringify(once) === JSON.stringify(again));
  }
}

console.log("\n── 缩放（resize）──");
{
  const blocks = [
    { id: "a", x: 0, y: 0,  w: 12, h: 10 },
    { id: "b", x: 0, y: 10, w: 12, h: 10 },
  ];
  const out = board.resize(blocks, { ...at(blocks, "b"), h: 20 }, COLS);
  check("被缩放的块钉在原地不上浮", at(out, "b").y === 10, `b.y=${at(out,"b").y}`);
  check("左边缘不被推动", at(out, "b").x === 0, `b.x=${at(out,"b").x}`);
  check("没有重叠", !overlaps(out), show(out));
}
{
  const blocks = [{ id: "a", x: 18, y: 0, w: 6, h: 6 }];
  const out = board.resize(blocks, { ...blocks[0], w: 12 }, COLS);
  check("拉宽超出右边界时截断，不反推 x", at(out, "a").x === 18 && at(out, "a").w === 6,
        `x${at(out,"a").x} w${at(out,"a").w}`);
}

console.log("\n── 整体重排（relayout）──");
{
  const blocks = [
    { id: "a", x: 0, y: 40, w: 12, h: 6 },
    { id: "b", x: 0, y: 0,  w: 12, h: 6 },
  ];
  const out = board.relayout(blocks);
  check("空洞被压掉，顺序按位置不按数组下标",
        at(out, "b").y === 0 && at(out, "a").y === 6,
        `b.y=${at(out,"b").y} a.y=${at(out,"a").y}`);
  check("没有重叠", !overlaps(out), show(out));
}
{
  /* 历史 bug：只上浮不下沉，两块都停在 y=0 */
  const blocks = [
    { id: "a", x: 0, y: 0, w: 24, h: 5 },
    { id: "b", x: 0, y: 3, w: 24, h: 5 },
  ];
  const out = board.relayout(blocks);
  check("重叠输入也能压成不重叠", !overlaps(out), show(out));
}

console.log("");
console.log("── 放哪就是哪（float，默认行为）──");
{
  /* 用户抱怨的两条，正是自动压紧的必然结果：
       「左边最上面的模块不能往下拖」—— 上方没东西挡，压紧把它拉回 y0
       「下面的往上拖会自动跑到最上面」—— 落点上方有空位，一路浮到顶
     float 模式只解重叠、不上浮，位置由用户说了算。 */
  const F = { float: true };
  {
    const blocks = [
      { id: "top", x: 0, y: 0, w: 12, h: 6 },
      { id: "low", x: 12, y: 0, w: 12, h: 6 },
    ];
    const out = board.place(blocks, { ...at(blocks, "top"), y: 20 }, COLS, F);
    check("最上面的块往下拖，停在你放的地方", at(out, "top").y === 20,
          `top.y=${at(out, "top").y}`);
  }
  {
    const blocks = [
      { id: "a", x: 0, y: 0,  w: 12, h: 6 },
      { id: "b", x: 0, y: 40, w: 12, h: 6 },
    ];
    const out = board.place(blocks, { ...at(blocks, "b"), y: 20 }, COLS, F);
    check("下面的块往上拖，停在中间而不是冲到顶", at(out, "b").y === 20,
          `b.y=${at(out, "b").y}`);
    check("上面那块不受影响", at(out, "a").y === 0, `a.y=${at(out, "a").y}`);
  }
  {
    const blocks = [
      { id: "a", x: 0, y: 0,  w: 12, h: 6 },
      { id: "b", x: 0, y: 10, w: 12, h: 6 },
    ];
    const out = board.place(blocks, { ...at(blocks, "b"), y: 2 }, COLS, F);
    check("拖到别人身上时，被压住的那块让开", !overlaps(out), show(out));
  }
  {
    const blocks = [
      { id: "a", x: 0, y: 0,  w: 12, h: 6 },
      { id: "b", x: 0, y: 30, w: 12, h: 6 },
    ];
    const tidy = board.relayout(blocks);
    check("「⇅ 整理」仍能把空白压掉", at(tidy, "b").y === 6, `b.y=${at(tidy, "b").y}`);
  }
}

console.log("\n── 找空位（findSlot）──");
{
  const blocks = [{ id: "a", x: 0, y: 0, w: 12, h: 6 }];
  const slot = board.findSlot(blocks, 12, 6, COLS);
  check("新块贴到已有内容旁边，而不是另起一行", slot.y === 0 && slot.x === 12,
        `x${slot.x} y${slot.y}`);
}

console.log(fails ? `\n${fails} 项不通过` : "\n全部通过");
process.exit(fails ? 1 : 0);
