import { useState } from "react";
import { Live2DCanvas } from "./components/Live2DCanvas";
import { StockPanel } from "./components/StockPanel";
import { ApiKeyPanel } from "./components/ApiKeyPanel";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PointerEvent, MouseEvent } from "react";

function App() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showStockPanel, setShowStockPanel] = useState(false);
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);

  // 左键拖拽
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    void getCurrentWindow().startDragging();
  };

  // 右键菜单
  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const openStockPanel = () => {
    setContextMenu(null);
    setShowStockPanel(true);
  };

  const openApiKeyPanel = () => {
    setContextMenu(null);
    setShowApiKeyPanel(true);
  };

  return (
    <div
      data-tauri-drag-region
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      style={{
        width: "100%",
        height: "100%",
        cursor: "grab",
        position: "relative",
      }}
    >
      <Live2DCanvas />

      {/* 右键菜单 */}
      {contextMenu && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <div className="context-menu-backdrop" onClick={closeContextMenu} />
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="context-menu-item" onClick={openApiKeyPanel}>
              DeepSeek API 设置
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={openStockPanel}>
              大A盯盘
            </div>
            <div className="context-menu-separator" />
            <div
              className="context-menu-item"
              onClick={async () => {
                await getCurrentWindow().close();
              }}
            >
              退出
            </div>
          </div>
        </div>
      )}

      {/* 模态面板需阻止 pointer 冒泡，否则会被根节点拖拽逻辑吞掉点击 */}
      {showApiKeyPanel && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <ApiKeyPanel onClose={() => setShowApiKeyPanel(false)} />
        </div>
      )}

      {showStockPanel && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <StockPanel onClose={() => setShowStockPanel(false)} />
        </div>
      )}
    </div>
  );
}

export default App;
