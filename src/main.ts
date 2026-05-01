import { PaintEngine, pigmentPalette } from "./paintEngine";
import type { Point, ViewMode } from "./types";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#paint-canvas");

if (!canvas) {
  throw new Error("Missing canvas element.");
}

const paintCanvas = canvas;
const engine = new PaintEngine(paintCanvas, 960, 640);
let activePointerId: number | null = null;
let lastPoint: Point | null = null;
let lastFrameTime = performance.now();

function canvasPoint(event: PointerEvent): Point {
  const rect = paintCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * engine.width,
    y: ((event.clientY - rect.top) / rect.height) * engine.height,
  };
}

function setViewMode(viewMode: ViewMode): void {
  engine.viewMode = viewMode;
  engine.render();
}

paintCanvas.addEventListener("pointerdown", (event) => {
  activePointerId = event.pointerId;
  lastPoint = canvasPoint(event);
  paintCanvas.setPointerCapture(event.pointerId);
});

paintCanvas.addEventListener("pointermove", (event) => {
  if (activePointerId !== event.pointerId || !lastPoint) {
    return;
  }

  const nextPoint = canvasPoint(event);
  engine.stroke(lastPoint, nextPoint);
  lastPoint = nextPoint;
  engine.render();
});

paintCanvas.addEventListener("pointerup", (event) => {
  if (activePointerId === event.pointerId) {
    activePointerId = null;
    lastPoint = null;
  }
});

paintCanvas.addEventListener("pointercancel", () => {
  activePointerId = null;
  lastPoint = null;
});

window.addEventListener("keydown", (event) => {
  const colorIndex = Number(event.key) - 1;

  if (colorIndex >= 0 && colorIndex < pigmentPalette.length) {
    engine.setBrushColor(pigmentPalette[colorIndex]);
    setViewMode("color");
    return;
  }

  switch (event.key.toLowerCase()) {
    case "d":
      engine.clear();
      break;
    case "w":
      setViewMode(engine.viewMode === "wetness" ? "color" : "wetness");
      break;
    case "l":
      setViewMode(engine.viewMode === "load" ? "color" : "load");
      break;
    case "t":
      setViewMode(engine.viewMode === "tooth" ? "color" : "tooth");
      break;
    case "c":
      setViewMode("color");
      break;
  }
});

function frame(now: number): void {
  const deltaSeconds = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  engine.decay(deltaSeconds);
  engine.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
