import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";

const STORE_PATH = "deepseek-config.json";
const STORE_KEY = "deepseek_config";
/** 界面展示名 */
const DISPLAY_MODEL = "deepseek v4pro";
/** 写入 Store、供后续 API 调用的模型 ID */
const API_MODEL = "deepseek-chat";

function formatInvokeError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "验证失败，请检查 Key 和网络";
}

interface Props {
  onClose: () => void;
}

export function ApiKeyPanel({ onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const handleTestAndSave = async () => {
    const key = apiKey.trim();
    if (!key) {
      setTestResult({ ok: false, msg: "请先输入 API Key" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const masked = await invoke<string>("setup_deepseek_key", { key });

      // 验证成功 → 保存到 Store
      const store = await Store.load(STORE_PATH);
      await store.set(STORE_KEY, { key, model: API_MODEL, displayModel: DISPLAY_MODEL });
      await store.save();

      setTestResult({
        ok: true,
        msg: `设置成功 — ${masked}，模型: ${DISPLAY_MODEL}`,
      });
      setSaved(true);
    } catch (err) {
      setTestResult({
        ok: false,
        msg: formatInvokeError(err),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="stock-panel-overlay"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="stock-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        {/* 头部 */}
        <div className="stock-panel-header">
          <span className="stock-panel-title">DeepSeek API 设置</span>
          <button type="button" className="stock-panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="stock-panel-section">
          {/* API Key 输入 */}
          <div className="stock-panel-label">API Key</div>
          <input
            className="stock-input"
            type="password"
            placeholder="sk-xxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTestResult(null);
              setSaved(false);
            }}
            style={{ width: "100%" }}
          />
          <div className="stock-intent-hint">你的 Key 仅存储在本地，不会上传</div>

          {/* 默认模型 */}
          <div className="stock-panel-label" style={{ marginTop: 12 }}>默认模型</div>
          <div className="stock-model-display">
            <span className="stock-model-icon">🧠</span>
            <span className="stock-model-name">{DISPLAY_MODEL}</span>
          </div>

          {/* 结果提示 */}
          {testResult && (
            <div className={testResult.ok ? "stock-save-msg" : "stock-parse-error"} style={{ marginTop: 10 }}>
              <div className={testResult.ok ? "" : "stock-parse-error-text"} style={testResult.ok ? { color: "#8f8" } : {}}>
                {testResult.ok ? "✅ " : "❌ "}{testResult.msg}
              </div>
            </div>
          )}

          {/* 按钮 */}
          <button
            type="button"
            className="stock-btn stock-btn-confirm"
            disabled={testing || saved || !apiKey.trim()}
            onClick={handleTestAndSave}
            style={{ marginTop: 14 }}
          >
            {testing ? "验证中..." : saved ? "已保存" : "测试并保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
