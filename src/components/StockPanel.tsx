import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { parseIntent, formatEvent, EVENT_ICONS, type ParsedIntent, type ParsedEvent } from "../utils/intentParser";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

interface StockEvent {
  event_type: string;
  threshold: number;
  triggered: boolean;
}

interface StockMonitor {
  code: string;
  name: string;
  events: StockEvent[];
}

interface StockInfo {
  name: string;
  code: string;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
}

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const STORE_PATH = "monitors.json";
const STORE_KEY = "monitors";

const PLACEHOLDERS = [
  "帮我看下贵州茅台，涨幅超过1%通知我",
  "盯一下宁德时代，跌破1800通知",
  "关注600519，涨了3%提醒我",
];

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

interface Props {
  onClose: () => void;
}

export function StockPanel({ onClose }: Props) {
  const [monitors, setMonitors] = useState<StockMonitor[]>([]);
  const [inputText, setInputText] = useState("");
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── 加载已保存的监控 ──
  const loadMonitors = useCallback(async () => {
    try {
      const store = await Store.load(STORE_PATH);
      const saved = await store.get<StockMonitor[]>(STORE_KEY);
      if (saved && saved.length > 0) {
        setMonitors(saved);
        for (const m of saved) {
          await invoke("add_stock_monitor", { code: m.code, name: m.name, events: m.events });
        }
      }
    } catch { /* 首次加载 */ }
  }, []);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  // ── 持久化 ──
  const persist = async (list: StockMonitor[]) => {
    const store = await Store.load(STORE_PATH);
    await store.set(STORE_KEY, list);
    await store.save();
  };

  // ── 从 API 获取股票名称（仅 code 匹配时需要） ──
  const fetchStockName = async (code: string): Promise<string> => {
    try {
      const info = await invoke<StockInfo>("fetch_stock_price", { code });
      return info.name;
    } catch {
      return code;
    }
  };

  // ── 解析输入 ──
  const handleParse = () => {
    setSaveMsg("");
    const result = parseIntent(inputText);
    setParsed(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  // ── 确认添加盯盘 ──
  const handleConfirm = async () => {
    if (!parsed?.stock || parsed.events.length === 0) return;
    setSaving(true);
    setSaveMsg("");

    const code = parsed.stock.code;
    const events: StockEvent[] = parsed.events.map((e) => ({ ...e, triggered: false }));

    let name = parsed.stock.name;
    if (parsed.stock.confidence === "code") {
      name = await fetchStockName(code);
    }

    await invoke("add_stock_monitor", { code, name, events });

    const updated = [...monitors.filter((m) => m.code !== code), { code, name, events } as StockMonitor];
    setMonitors(updated);
    await persist(updated);

    setSaveMsg(`已添加「${name}」盯盘`);
    setInputText("");
    setParsed(null);
    setSaving(false);
    inputRef.current?.focus();
  };

  // ── 删除监控 ──
  const handleRemove = async (code: string) => {
    await invoke("remove_stock_monitor", { code });
    const updated = monitors.filter((m) => m.code !== code);
    setMonitors(updated);
    await persist(updated);
  };

  // ── 手动补充事件 ──
  const addManualEvent = (ev: ParsedEvent) => {
    if (!parsed) return;
    const exists = parsed.events.some(
      (e) => e.event_type === ev.event_type && e.threshold === ev.threshold,
    );
    if (exists) return;
    setParsed({ ...parsed, events: [...parsed.events, ev], error: undefined });
  };

  const removeEvent = (idx: number) => {
    if (!parsed) return;
    const events = parsed.events.filter((_, i) => i !== idx);
    setParsed({ ...parsed, events, error: events.length === 0 ? "未识别到事件条件" : undefined });
  };

  // ── placeholder ──
  const placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

  // ── 渲染 ──
  return (
    <div className="stock-panel-overlay" onClick={onClose}>
      <div className="stock-panel" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="stock-panel-header">
          <span className="stock-panel-title">大A盯盘</span>
          <button className="stock-panel-close" onClick={onClose}>✕</button>
        </div>

        {/* ── 智能输入区 ── */}
        <div className="stock-panel-section">
          <div className="stock-panel-label">告诉我你想盯什么</div>
          <textarea
            ref={inputRef}
            className="stock-intent-input"
            placeholder={placeholder}
            value={inputText}
            onChange={(e) => { setInputText(e.target.value); setParsed(null); setSaveMsg(""); }}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <div className="stock-intent-hint">Enter 解析 · Shift+Enter 换行</div>
          <button className="stock-btn stock-btn-primary" onClick={handleParse} disabled={!inputText.trim()}>
            解析意图
          </button>
        </div>

        {/* ── 解析结果卡片 ── */}
        {parsed && (
          <div className="stock-panel-section">
            {parsed.error ? (
              <div className="stock-parse-error">
                <div className="stock-parse-error-icon">!</div>
                <div className="stock-parse-error-text">{parsed.error}</div>
                <div className="stock-parse-error-hint">
                  试试：「帮我看下贵州茅台，涨幅超过3%通知我」
                </div>
              </div>
            ) : parsed.stock ? (
              <div className="stock-parse-result">
                <div className="stock-parse-stock">
                  <span className="stock-parse-stock-icon">O</span>
                  <span className="stock-parse-stock-name">{parsed.stock.name}</span>
                  <span className="stock-parse-stock-code">{parsed.stock.code}</span>
                  {parsed.stock.confidence === "partial" && (
                    <span className="stock-parse-stock-fuzzy">模糊匹配</span>
                  )}
                </div>

                {/* 事件列表 */}
                <div className="stock-parse-events">
                  {parsed.events.map((ev, i) => (
                    <span key={i} className="stock-parse-event-tag">
                      {EVENT_ICONS[ev.event_type] || ""} {formatEvent(ev)}
                      <button className="stock-event-tag-remove" onClick={() => removeEvent(i)}>✕</button>
                    </span>
                  ))}
                </div>

                {/* 快速添加事件 */}
                <QuickEvents onAdd={addManualEvent} existing={parsed.events} />

                {/* 确认按钮 */}
                <button
                  className="stock-btn stock-btn-confirm"
                  disabled={parsed.events.length === 0 || saving}
                  onClick={handleConfirm}
                >
                  {saving ? "保存中..." : "确认盯盘"}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ── 保存提示 ── */}
        {saveMsg && <div className="stock-save-msg">{saveMsg}</div>}

        {/* ── 已监控列表 ── */}
        {monitors.length > 0 && (
          <div className="stock-panel-section">
            <div className="stock-panel-label">盯盘列表（{monitors.length}）</div>
            <div className="stock-monitor-list">
              {monitors.map((m) => (
                <div key={m.code} className="stock-monitor-item">
                  <div className="stock-monitor-info">
                    <span className="stock-monitor-name">{m.name}</span>
                    <span className="stock-monitor-code">{m.code}</span>
                    <div className="stock-monitor-events">
                      {m.events.map((ev, i) => (
                        <span key={i} className="stock-event-tag stock-event-tag-small">
                          {EVENT_ICONS[ev.event_type] || ""} {formatEvent(ev)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="stock-btn stock-btn-danger" onClick={() => handleRemove(m.code)}>
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 快速添加事件按钮
// ─────────────────────────────────────────────────────────────────────────

function QuickEvents({
  onAdd,
  existing,
}: {
  onAdd: (ev: ParsedEvent) => void;
  existing: ParsedEvent[];
}) {
  const quick = [
    { label: "+1%涨", event_type: "change_up", threshold: 1 },
    { label: "+3%涨", event_type: "change_up", threshold: 3 },
    { label: "+5%涨", event_type: "change_up", threshold: 5 },
    { label: "-1%跌", event_type: "change_down", threshold: 1 },
    { label: "-3%跌", event_type: "change_down", threshold: 3 },
    { label: "-5%跌", event_type: "change_down", threshold: 5 },
  ];

  const available = quick.filter(
    (q) => !existing.some((e) => e.event_type === q.event_type && e.threshold === q.threshold),
  );
  if (available.length === 0) return null;

  return (
    <div className="stock-quick-events">
      <span className="stock-quick-label">快速添加：</span>
      {available.map((q) => (
        <button
          key={`${q.event_type}-${q.threshold}`}
          className="stock-quick-btn"
          onClick={() => onAdd({ event_type: q.event_type, threshold: q.threshold, raw: "" })}
        >
          {q.label}
        </button>
      ))}
    </div>
  );
}
