import { lookupStock, type StockMatch } from "./stockNames";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface ParsedEvent {
  event_type: string; // "change_up" | "change_down" | "price_above" | "price_below"
  threshold: number;
  raw?: string; // 原始匹配文本，调试用
}

export interface ParsedIntent {
  stock: StockMatch | null;
  events: ParsedEvent[];
  rawInput: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// 事件提取规则
// ---------------------------------------------------------------------------

interface EventRule {
  regex: RegExp;
  type: string;
  // 提取第几个捕获组作为阈值
  thresholdGroup: number;
  // 如果是百分比类（change_up / change_down），值为正数百分比
  // 如果是价格类，值为元
}

const EVENT_RULES: EventRule[] = [
  // ── 涨幅类 ──
  {
    regex: /涨幅[超过达到大于突破]+?\s*(\d+\.?\d*)\s*%/,
    type: "change_up",
    thresholdGroup: 1,
  },
  {
    regex: /涨[幅超达到]+?\s*(\d+\.?\d*)\s*%/,
    type: "change_up",
    thresholdGroup: 1,
  },
  {
    regex: /上涨[超过大于达到]?\s*(\d+\.?\d*)\s*%/,
    type: "change_up",
    thresholdGroup: 1,
  },
  {
    regex: /涨了\s*(\d+\.?\d*)\s*%/,
    type: "change_up",
    thresholdGroup: 1,
  },

  // ── 跌幅类 ──
  {
    regex: /跌幅[超过达到大于]+?\s*(\d+\.?\d*)\s*%/,
    type: "change_down",
    thresholdGroup: 1,
  },
  {
    regex: /跌[幅超达到]+?\s*(\d+\.?\d*)\s*%/,
    type: "change_down",
    thresholdGroup: 1,
  },
  {
    regex: /下跌[超过大于达到]?\s*(\d+\.?\d*)\s*%/,
    type: "change_down",
    thresholdGroup: 1,
  },
  {
    regex: /跌了\s*(\d+\.?\d*)\s*%/,
    type: "change_down",
    thresholdGroup: 1,
  },

  // ── 价格突破（上限） ──
  {
    regex: /(?:价格?|[涨上])[到突破超]\s*(\d+\.?\d*)\s*(?:元|块)?(?!\s*%)/,
    type: "price_above",
    thresholdGroup: 1,
  },
  {
    regex: /突破\s*(\d+\.?\d*)\s*(?:元|块)?(?!\s*%)/,
    type: "price_above",
    thresholdGroup: 1,
  },

  // ── 价格跌破（下限） ──
  {
    regex: /[跌破][到破]?\s*(\d+\.?\d*)\s*(?:元|块)?(?!\s*%)/,
    type: "price_below",
    thresholdGroup: 1,
  },
  {
    regex: /跌[到下至]\s*(\d+\.?\d*)\s*(?:元|块)?(?!\s*%)/,
    type: "price_below",
    thresholdGroup: 1,
  },
];

// ---------------------------------------------------------------------------
// 股票名提取规则
// ---------------------------------------------------------------------------

/**
 * 从用户输入中提取可能的股票名称/代码。
 * 匹配模式："看下XX"、"盯一下XX"、"XX的股票" 等
 */
function extractStockCandidate(input: string): string | null {
  // 模式1: "看下/盯下/关注/帮我看/帮我盯 + 股票名"
  const m1 = input.match(
    /(?:看下|盯下|关注|帮我[看盯][一下]*|帮我查[一下看]*|查看|监控|跟踪|帮我看下|帮我盯下)\s*([一-龥a-zA-Z0-9]+?)(?:的股票|股票|的行情|行情|[，,。.\s]|$)/,
  );
  if (m1) return m1[1].trim();

  // 模式2: "XX的股票" / "XX股票"
  const m2 = input.match(/([一-龥]{2,6})(?:的股票|股票)/);
  if (m2) return m2[1].trim();

  // 模式3: 直接找 6 位数字代码
  const m3 = input.match(/(\d{6})/);
  if (m3) return m3[1];

  // 模式4: 已含前缀代码 sh/sz/bj + 6位
  const m4 = input.match(/([sb][hzj]\d{6})/i);
  if (m4) return m4[1].toLowerCase();

  // 模式5: 最宽松 —— 找句子中第一个中文名词（2-6字），但不是"今天/明天/如果/一旦"
  const m5 = input.match(/([一-龥]{2,6})/);
  if (m5) {
    const word = m5[1];
    const stopWords = ["今天", "明天", "后天", "现在", "如果", "一旦", "只要", "帮我", "提醒", "通知", "超过", "达到", "突破", "跌破", "涨幅", "跌幅", "股票", "行情", "会有", "有什么", "能不能", "可不可以", "帮忙", "马上", "立即"];
    if (!stopWords.includes(word)) {
      return word;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 主解析函数
// ---------------------------------------------------------------------------

export function parseIntent(raw: string): ParsedIntent {
  const input = raw.trim();
  if (!input) {
    return { stock: null, events: [], rawInput: raw, error: "请输入盯盘指令" };
  }

  // 1. 提取股票
  const candidate = extractStockCandidate(input);
  let stock: StockMatch | null = null;
  if (candidate) {
    stock = lookupStock(candidate);
  }

  // 2. 提取事件
  const events: ParsedEvent[] = [];
  const usedPositions = new Set<number>();

  for (const rule of EVENT_RULES) {
    // 重置 lastIndex（全局正则需要）
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      const pos = match.index;
      if (usedPositions.has(pos)) continue; // 避免同一位置被多个规则匹配
      usedPositions.add(pos);

      const threshold = parseFloat(match[rule.thresholdGroup]);
      if (isNaN(threshold) || threshold <= 0) continue;

      events.push({
        event_type: rule.type,
        threshold,
        raw: match[0],
      });
    }
  }

  // 去重：同一 type + threshold 只保留一次
  const deduped = events.filter(
    (e, i, arr) => arr.findIndex((x) => x.event_type === e.event_type && x.threshold === e.threshold) === i,
  );

  // 3. 错误检查
  if (!stock) {
    return {
      stock: null,
      events: deduped,
      rawInput: raw,
      error: candidate
        ? `未找到「${candidate}」的股票信息，请尝试输入 6 位代码`
        : "未识别到股票，请输入股票名称或代码",
    };
  }

  if (deduped.length === 0) {
    return {
      stock,
      events: [],
      rawInput: raw,
      error: "未识别到事件条件，请说明涨跌幅或价格阈值（如：涨幅超过3%）",
    };
  }

  return { stock, events: deduped, rawInput: raw };
}

// ---------------------------------------------------------------------------
// 人类可读标签
// ---------------------------------------------------------------------------

export const EVENT_LABELS: Record<string, string> = {
  change_up: "涨幅 ≥",
  change_down: "跌幅 ≥",
  price_above: "价格 ≥",
  price_below: "价格 ≤",
};

export const EVENT_ICONS: Record<string, string> = {
  change_up: "📈",
  change_down: "📉",
  price_above: "🔔",
  price_below: "🔻",
};

export function formatEvent(ev: { event_type: string; threshold: number }): string {
  const suffix = ev.event_type.startsWith("change") ? "%" : " 元";
  return `${EVENT_LABELS[ev.event_type] || ev.event_type} ${ev.threshold}${suffix}`;
}
