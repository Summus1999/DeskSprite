import { Live2DCanvas } from "./components/Live2DCanvas";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PointerEvent } from "react";

function App() {
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    // canvas 会占满窗口，直接调用 Tauri 拖拽 API，避免事件落不到拖拽区域。
    void getCurrentWindow().startDragging();
  };

  return (
    <div
      data-tauri-drag-region
      onPointerDown={handlePointerDown}
      style={{
        width: "100%",
        height: "100%",
        cursor: "grab",
      }}
    >
      <Live2DCanvas />
    </div>
  );
}

export default App;
