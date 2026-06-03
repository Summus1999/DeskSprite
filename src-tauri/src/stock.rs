use serde::{Deserialize, Serialize};

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

/// 从新浪财经获取股票数据
#[tauri::command]
pub async fn fetch_stock_price(code: String) -> Result<StockInfo, String> {
    let url = format!("https://hq.sinajs.cn/list={}", code);
    let client = reqwest::Client::new();

    let resp = client
        .get(&url)
        .header("Referer", "https://finance.sina.com.cn")
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let body = resp
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    parse_sina_response(&code, &body)
}

fn parse_sina_response(code: &str, body: &str) -> Result<StockInfo, String> {
    // 新浪返回格式: var hq_str_sh600519="贵州茅台,1850.00,1840.00,..."
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
