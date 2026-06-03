use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

// ---------------------------------------------------------------------------
// DeepSeek API 数据结构
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Option<Vec<Choice>>,
}

#[derive(Deserialize)]
struct Choice {
    message: Option<MessageContent>,
}

#[derive(Deserialize)]
struct MessageContent {
    content: Option<String>,
}

#[derive(Deserialize)]
struct ErrorResponse {
    error: Option<ErrorDetail>,
}

#[derive(Deserialize)]
struct ErrorDetail {
    message: String,
}

// ---------------------------------------------------------------------------
// 默认配置
// ---------------------------------------------------------------------------

/// 界面展示用名称（产品文档中的默认模型名）
const DISPLAY_MODEL: &str = "deepseek v4pro";
/// DeepSeek API 实际模型 ID（与展示名不同，验证请求必须用此 ID）
const API_MODEL: &str = "deepseek-chat";
const API_BASE: &str = "https://api.deepseek.com/v1/chat/completions";
const REQUEST_TIMEOUT_SECS: u64 = 20;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

fn mask_key(key: &str) -> String {
    if key.len() <= 8 {
        return "****".to_string();
    }
    let prefix = &key[..4];
    let suffix = &key[key.len() - 4..];
    format!("{}…{}", prefix, suffix)
}

// ---------------------------------------------------------------------------
// Tauri 命令：设置并验证 DeepSeek API Key
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn setup_deepseek_key(app_handle: AppHandle, key: String) -> Result<String, String> {
    let key = key.trim().to_string();

    if key.is_empty() {
        return Err("API Key 不能为空".into());
    }

    // 发送最小请求验证 Key 是否有效
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("HTTP 客户端初始化失败: {}", e))?;
    let req_body = ChatRequest {
        model: API_MODEL.to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: "hi".to_string(),
        }],
        max_tokens: 1,
    };

    let resp = client
        .post(API_BASE)
        .header("Authorization", format!("Bearer {}", key))
        .header("Content-Type", "application/json")
        .json(&req_body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let status = resp.status();

    if status.is_success() {
        // 解析响应确认格式正确
        let _body: ChatResponse = resp.json().await.map_err(|e| format!("响应解析失败: {}", e))?;

        // 发送系统通知
        let masked = mask_key(&key);
        let _ = app_handle
            .notification()
            .builder()
            .title("DeepSeek API 设置成功")
            .body(format!(
                "API Key: {}，默认模型: {}",
                masked, DISPLAY_MODEL
            ))
            .show();

        Ok(masked)
    } else {
        let err_body: ErrorResponse = resp
            .json()
            .await
            .unwrap_or(ErrorResponse { error: None });

        let msg = err_body
            .error
            .map(|e| e.message)
            .unwrap_or_else(|| format!("HTTP {}", status.as_u16()));

        Err(format!("API 验证失败: {}", msg))
    }
}
