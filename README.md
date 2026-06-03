# DeskSprite

桌面精灵应用 —— 让 Live2D 角色（穂乃莉百々瀬 / Hiyori Momose）在你的桌面上陪你工作。

## 技术栈

- **前端**：React 18 + TypeScript + Vite
- **渲染**：PixiJS + pixi-live2d-display（Cubism 4）
- **桌面框架**：[Tauri 2](https://tauri.app/)（Rust）

## 功能

- 🐱 桌面常驻 Live2D 角色，透明无边框窗口
- 🖱️ 鼠标拖拽角色到屏幕任意位置
- 👆 点击角色触发随机待机动作（motion）
- 📋 系统托盘：左键聚焦窗口，右键菜单（显示/隐藏、退出）

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 项目结构

```
DeskSprite/
├── src/                  # React 前端源码
│   ├── main.tsx          # 入口
│   ├── App.tsx           # 根组件（拖拽交互）
│   └── components/
│       └── Live2DCanvas.tsx  # Live2D 渲染组件
├── public/
│   ├── models/Hiyori/    # Live2D 模型资源
│   └── vendor/live2d/    # Cubism 4 Core 库
├── src-tauri/            # Tauri 后端（Rust）
│   └── src/
│       ├── main.rs       # 入口
│       ├── lib.rs        # 应用初始化
│       ├── tray.rs       # 系统托盘
│       └── stock.rs      # 股票数据接口（预留）
└── index.html            # HTML 入口
```

## 窗口配置

| 属性         | 说明               |
| ------------ | ------------------ |
| 无边框       | 透明背景，无标题栏 |
| 始终置顶     | 不会被其他窗口遮挡 |
| 隐藏任务栏   | 不在任务栏显示     |
| 默认尺寸     | 400×500            |

## 许可证

[MIT](LICENSE)