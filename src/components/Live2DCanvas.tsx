import { useEffect, useRef } from "react";

// 模型文件已随应用一起打包到 public/models 下，生产环境直接走本地资源，
// 不依赖外网与 CacheStorage（这些在 Tauri WebView2 生产环境下并不可靠）。
const HIYORI_MODEL_URL = "/models/Hiyori/Hiyori.model3.json";

export function Live2DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const PIXI = await import("pixi.js");
      // 必须从 cubism4 子入口导入：默认入口会要求加载 Cubism 2 的 live2d.min.js，
      // 而本项目使用的是 Cubism 4 模型（仅加载了 live2dcubismcore.min.js）。
      const { Live2DModel } = await import("pixi-live2d-display/cubism4");

      const app = new PIXI.Application({
        view: canvas as any,
        width: 400,
        height: 500,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      }) as any;

      appRef.current = app;

      try {
        const model = await Live2DModel.from(HIYORI_MODEL_URL, { autoInteract: false }) as any;

        modelRef.current = model;

        model.anchor.set(0.5, 0.5);
        model.x = app.screen.width / 2;
        model.y = app.screen.height / 2 + 20;

        const scaleX = (app.screen.width * 0.85) / model.width;
        const scaleY = (app.screen.height * 0.85) / model.height;
        const scale = Math.min(scaleX, scaleY, 0.22);
        model.scale.set(scale);

        // 点击交互
        model.on("hit", () => {
          try {
            const mgr = model.internalModel.motionManager;
            if (mgr?.groups?.idle) {
              const idx = Math.floor(Math.random() * mgr.groups.idle.length);
              model.motion("idle", idx);
            }
          } catch { /* ignore */ }
        });

        app.stage.addChild(model as any);
      } catch (err) {
        console.error("Live2D load error:", err);
      }
    };

    init();

    return () => {
      if (modelRef.current?.destroy) {
        try { modelRef.current.destroy(); } catch {}
      }
      if (appRef.current?.destroy) {
        try { appRef.current.destroy(true, { children: true }); } catch {}
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "transparent",
      }}
    />
  );
}
