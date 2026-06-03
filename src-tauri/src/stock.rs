use chrono::{Datelike, Local, NaiveTime, Weekday};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

// ---------------------------------------------------------------------------
// 数据结构
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockInfo {
    pub name: String,
    pub code: String,
    pub price: f64,
    pub change: f64,
    pub change_percent: f64,
    pub high: f64,
    pub low: f64,
}

/// 一条盯盘事件规则
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockEvent {
    /// "price_above" | "price_below" | "change_up" | "change_down"
    pub event_type: String,
    /// 阈值：价格类为元，涨跌幅类为百分比（正数）
    pub threshold: f64,
    /// 运行时追踪：本次条件是否已触发（避免重复通知）
    #[serde(default)]
    pub triggered: bool,
}

/// 一只股票的盯盘配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockMonitor {
    pub code: String,
    pub name: String,
    pub events: Vec<StockEvent>,
}

/// 全局盯盘状态（Tauri 管理）
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct MonitorState {
    pub monitors: Vec<StockMonitor>,
}

// ---------------------------------------------------------------------------
// 新浪财经数据获取
// ---------------------------------------------------------------------------

fn parse_sina_response(code: &str, body: &str) -> Result<StockInfo, String> {
    let start = body.find('"').ok_or("格式错误")?;
    let end = body.rfind('"').ok_or("格式错误")?;
    let data = &body[start + 1..end];
    let fields: Vec<&str> = data.split(',').collect();

    if fields.len() < 32 {
        return Err("数据字段不足".into());
    }

    let name = fields[0].to_string();
    let price = fields[3].parse::<f64>().unwrap_or(0.0);
    let prev_close = fields[2].parse::<f64>().unwrap_or(price);
    let change = price - prev_close;
    let change_percent = if prev_close != 0.0 {
        (change / prev_close) * 100.0
    } else {
        0.0
    };
    let high = fields[4].parse::<f64>().unwrap_or(0.0);
    let low = fields[5].parse::<f64>().unwrap_or(0.0);

    Ok(StockInfo {
        name,
        code: code.to_string(),
        price,
        change,
        change_percent,
        high,
        low,
    })
}

async fn fetch_stock_data(code: &str) -> Result<StockInfo, String> {
    let url = format!("https://hq.sinajs.cn/list={}", code);
    let client = reqwest::Client::new();

    let resp = client
        .get(&url)
        .header("Referer", "https://finance.sina.com.cn")
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let body = resp.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    parse_sina_response(code, &body)
}

// ---------------------------------------------------------------------------
// 交易时段判断
// ---------------------------------------------------------------------------

fn is_trading_time() -> bool {
    let now = Local::now();
    let weekday = now.weekday();
    if matches!(weekday, Weekday::Sat | Weekday::Sun) {
        return false;
    }
    let time = now.time();
    let am_start = NaiveTime::from_hms_opt(9, 30, 0).unwrap();
    let am_end = NaiveTime::from_hms_opt(11, 30, 0).unwrap();
    let pm_start = NaiveTime::from_hms_opt(13, 0, 0).unwrap();
    let pm_end = NaiveTime::from_hms_opt(15, 0, 0).unwrap();

    (time >= am_start && time <= am_end) || (time >= pm_start && time <= pm_end)
}

// ---------------------------------------------------------------------------
// 事件检测 & 系统通知
// ---------------------------------------------------------------------------

fn build_notification(stock: &StockInfo, event: &StockEvent) -> (String, String) {
    match event.event_type.as_str() {
        "price_above" => (
            format!("🔔 {} 突破目标价", stock.name),
            format!("现价 {:.2}  ≥  目标 {:.2}", stock.price, event.threshold),
        ),
        "price_below" => (
            format!("🔻 {} 跌破目标价", stock.name),
            format!("现价 {:.2}  ≤  目标 {:.2}", stock.price, event.threshold),
        ),
        "change_up" => (
            format!("📈 {} 涨幅达 {:.2}%", stock.name, stock.change_percent),
            format!("现价 {:.2}，涨跌额 {:.2}", stock.price, stock.change),
        ),
        "change_down" => (
            format!("📉 {} 跌幅达 {:.2}%", stock.name, stock.change_percent),
            format!("现价 {:.2}，涨跌额 {:.2}", stock.price, stock.change),
        ),
        _ => (String::new(), String::new()),
    }
}

fn eval_event(stock: &StockInfo, event: &StockEvent) -> bool {
    match event.event_type.as_str() {
        "price_above" => stock.price >= event.threshold,
        "price_below" => stock.price <= event.threshold,
        "change_up" => stock.change_percent >= event.threshold,
        "change_down" => stock.change_percent <= -event.threshold,
        _ => false,
    }
}

fn check_and_notify(monitor: &mut StockMonitor, stock: &StockInfo, app_handle: &AppHandle) {
    for event in &mut monitor.events {
        let triggered_now = eval_event(stock, event);

        if triggered_now && !event.triggered {
            // 首次触发 → 发通知
            event.triggered = true;
            let (title, body) = build_notification(stock, event);
            let _ = app_handle
                .notification()
                .builder()
                .title(title)
                .body(body)
                .show();
        } else if !triggered_now && event.triggered {
            // 条件消失 → 复位，等待下一次触发
            event.triggered = false;
        }
    }
}

// ---------------------------------------------------------------------------
// 后台轮询任务
// ---------------------------------------------------------------------------

pub async fn start_monitor_loop(app_handle: AppHandle) {
    let poll_interval = tokio::time::Duration::from_secs(5 * 60); // 5 分钟

    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        if !is_trading_time() {
            continue;
        }

        // 简易节流：距上次轮询不足 5 分钟则跳过
        // 使用 Instant 而非 sleep 循环，便于非交易时段快速跳过
        let monitors: Vec<StockMonitor> = {
            let state = app_handle.state::<Mutex<MonitorState>>();
            let locked = state.lock().unwrap();
            locked.monitors.clone()
        };

        if monitors.is_empty() {
            // 没有盯盘任务，等久一点再检查
            tokio::time::sleep(poll_interval).await;
            continue;
        }

        for monitor in monitors {
            match fetch_stock_data(&monitor.code).await {
                Ok(stock) => {
                    let state = app_handle.state::<Mutex<MonitorState>>();
                    let mut state = state.lock().unwrap();
                    if let Some(m) = state.monitors.iter_mut().find(|m| m.code == monitor.code) {
                        check_and_notify(m, &stock, &app_handle);
                    }
                }
                Err(e) => {
                    eprintln!("获取 {} 数据失败: {}", monitor.code, e);
                }
            }
        }

        tokio::time::sleep(poll_interval).await;
    }
}

// ---------------------------------------------------------------------------
// Tauri 命令
// ---------------------------------------------------------------------------

/// 查询单只股票实时行情（供前端确认股票名称）
#[tauri::command]
pub async fn fetch_stock_price(code: String) -> Result<StockInfo, String> {
    fetch_stock_data(&code).await
}

/// 添加或更新一只股票的盯盘配置
#[tauri::command]
pub fn add_stock_monitor(
    state: tauri::State<'_, Mutex<MonitorState>>,
    code: String,
    name: String,
    events: Vec<StockEvent>,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.monitors.retain(|m| m.code != code);
    state.monitors.push(StockMonitor { code, name, events });
    Ok(())
}

/// 删除一只股票的盯盘配置
#[tauri::command]
pub fn remove_stock_monitor(
    state: tauri::State<'_, Mutex<MonitorState>>,
    code: String,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.monitors.retain(|m| m.code != code);
    Ok(())
}

/// 列出当前所有盯盘配置
#[tauri::command]
pub fn list_stock_monitors(
    state: tauri::State<'_, Mutex<MonitorState>>,
) -> Result<Vec<StockMonitor>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.monitors.clone())
}
