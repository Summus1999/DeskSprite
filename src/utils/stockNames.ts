// 热门 A 股名称 → 新浪代码映射
// 支持全称和常见简称
interface StockEntry {
  names: string[]; // 多个别名
  code: string;
}

const STOCK_LIST: StockEntry[] = [
  // ── 白酒 ──
  { names: ["贵州茅台", "茅台"], code: "sh600519" },
  { names: ["五粮液"], code: "sz000858" },
  { names: ["泸州老窖", "老窖"], code: "sz000568" },
  { names: ["洋河股份", "洋河"], code: "sz002304" },
  { names: ["山西汾酒", "汾酒"], code: "sh600809" },
  { names: ["古井贡酒", "古井"], code: "sz000596" },

  // ── 银行 ──
  { names: ["工商银行", "工行"], code: "sh601398" },
  { names: ["建设银行", "建行"], code: "sh601939" },
  { names: ["农业银行", "农行"], code: "sh601288" },
  { names: ["中国银行", "中行"], code: "sh601988" },
  { names: ["招商银行", "招行"], code: "sh600036" },
  { names: ["平安银行"], code: "sz000001" },
  { names: ["兴业银行", "兴业"], code: "sh601166" },
  { names: ["交通银行", "交行"], code: "sh601328" },
  { names: ["浦发银行", "浦发"], code: "sh600000" },

  // ── 保险 ──
  { names: ["中国平安", "平安"], code: "sh601318" },
  { names: ["中国人寿", "人寿"], code: "sh601628" },
  { names: ["中国太保", "太保"], code: "sh601601" },

  // ── 证券 ──
  { names: ["中信证券", "中信"], code: "sh600030" },
  { names: ["东方财富", "东财"], code: "sz300059" },
  { names: ["华泰证券", "华泰"], code: "sh601688" },
  { names: ["国泰君安", "国君"], code: "sh601211" },
  { names: ["中金公司", "中金"], code: "sh601995" },

  // ── 新能源 ──
  { names: ["宁德时代", "宁德"], code: "sz300750" },
  { names: ["比亚迪"], code: "sz002594" },
  { names: ["隆基绿能", "隆基"], code: "sh601012" },
  { names: ["阳光电源", "阳光"], code: "sz300274" },
  { names: ["通威股份", "通威"], code: "sh600438" },
  { names: ["亿纬锂能", "亿纬"], code: "sz300014" },
  { names: ["赣锋锂业", "赣锋"], code: "sz002460" },
  { names: ["天齐锂业", "天齐"], code: "sz002466" },

  // ── 科技 / 半导体 ──
  { names: ["中芯国际", "中芯"], code: "sh688981" },
  { names: ["海康威视", "海康"], code: "sz002415" },
  { names: ["立讯精密", "立讯"], code: "sz002475" },
  { names: ["科大讯飞", "讯飞"], code: "sz002230" },
  { names: ["中兴通讯", "中兴"], code: "sz000063" },
  { names: ["北方华创", "北方"], code: "sz002371" },
  { names: ["韦尔股份", "韦尔"], code: "sh603501" },
  { names: ["卓胜微"], code: "sz300782" },
  { names: ["中科曙光", "曙光"], code: "sh603019" },
  { names: ["浪潮信息", "浪潮"], code: "sz000977" },

  // ── 医药 ──
  { names: ["药明康德", "药明"], code: "sh603259" },
  { names: ["恒瑞医药", "恒瑞"], code: "sh600276" },
  { names: ["迈瑞医疗", "迈瑞"], code: "sz300760" },
  { names: ["片仔癀"], code: "sh600436" },
  { names: ["爱尔眼科", "爱尔"], code: "sz300015" },
  { names: ["智飞生物", "智飞"], code: "sz300122" },
  { names: ["长春高新", "长春"], code: "sz000661" },

  // ── 地产 ──
  { names: ["万科A", "万科"], code: "sz000002" },
  { names: ["保利发展", "保利"], code: "sh600048" },

  // ── 汽车 ──
  { names: ["上汽集团", "上汽"], code: "sh600104" },
  { names: ["长城汽车", "长城"], code: "sh601633" },
  { names: ["长安汽车", "长安"], code: "sz000625" },
  { names: ["赛力斯"], code: "sh601127" },

  // ── 消费 ──
  { names: ["美的集团", "美的"], code: "sz000333" },
  { names: ["格力电器", "格力"], code: "sz000651" },
  { names: ["伊利股份", "伊利"], code: "sh600887" },
  { names: ["海天味业", "海天"], code: "sh603288" },
  { names: ["中国中免", "中免"], code: "sh601888" },

  // ── 能源 / 资源 ──
  { names: ["中国石油", "中石油"], code: "sh601857" },
  { names: ["中国石化", "中石化"], code: "sh600028" },
  { names: ["中国神华", "神华"], code: "sh601088" },
  { names: ["长江电力", "长电"], code: "sh600900" },
  { names: ["紫金矿业", "紫金"], code: "sh601899" },

  // ── 其他热门 ──
  { names: ["顺丰控股", "顺丰"], code: "sz002352" },
  { names: ["京东方A", "京东方"], code: "sz000725" },
  { names: ["三一重工", "三一"], code: "sh600031" },
  { names: ["中国中车", "中车"], code: "sh601766" },
  { names: ["中国建筑", "中建"], code: "sh601668" },
  { names: ["分众传媒", "分众"], code: "sz002027" },
  { names: ["牧原股份", "牧原"], code: "sz002714" },
  { names: ["海螺水泥", "海螺"], code: "sh600585" },
  { names: ["福耀玻璃", "福耀"], code: "sh600660" },
  { names: ["中国联通", "联通"], code: "sh600050" },
  { names: ["中国电信", "电信"], code: "sh601728" },
  { names: ["工业富联", "富联"], code: "sh601138" },
  { names: ["寒武纪"], code: "sh688256" },
  { names: ["金山办公", "金山"], code: "sh688111" },
  // 总共 ~80 只热门股票
];

// ── 导出查找函数 ──

export interface StockMatch {
  name: string; // 匹配到的标准名称
  code: string;
  confidence: "exact" | "partial" | "code";
}

/**
 * 根据用户输入查找股票代码。
 * 支持：全称、简称、6位代码。
 */
export function lookupStock(input: string): StockMatch | null {
  const trimmed = input.trim();

  // 1. 纯 6 位数字代码
  if (/^\d{6}$/.test(trimmed)) {
    const first = trimmed[0];
    let prefix = "sh";
    if (first === "0" || first === "3") prefix = "sz";
    else if (first === "8" || first === "4") prefix = "bj";
    return {
      name: trimmed, // 名称后续通过 API 获取
      code: `${prefix}${trimmed}`,
      confidence: "code",
    };
  }

  // 2. 已含前缀的完整代码
  if (/^(sh|sz|bj)\d{6}$/.test(trimmed)) {
    return { name: trimmed, code: trimmed, confidence: "code" };
  }

  // 3. 精确匹配股票全称/简称
  for (const entry of STOCK_LIST) {
    for (const name of entry.names) {
      if (name === trimmed) {
        return { name: entry.names[0], code: entry.code, confidence: "exact" };
      }
    }
  }

  // 4. 模糊匹配：用户输入是股票名的子串，或股票名是用户输入的子串
  let best: StockMatch | null = null;
  let bestLen = 0;

  for (const entry of STOCK_LIST) {
    for (const name of entry.names) {
      if (name.includes(trimmed) && name.length > bestLen) {
        best = { name: entry.names[0], code: entry.code, confidence: "partial" };
        bestLen = name.length;
      }
    }
  }

  if (best) return best;

  // 5. 反向模糊：股票名是用户输入的子串
  for (const entry of STOCK_LIST) {
    for (const name of entry.names) {
      if (trimmed.includes(name) && name.length > bestLen) {
        best = { name: entry.names[0], code: entry.code, confidence: "partial" };
        bestLen = name.length;
      }
    }
  }

  return best;
}
