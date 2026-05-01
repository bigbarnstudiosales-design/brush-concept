import { loadImageStampBrush } from "./brushBehavior";
import { PaintEngine, pigmentPalette } from "./paintEngine";
import type { Point, ViewMode } from "./types";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#paint-canvas");
const brushSizeInput = document.querySelector<HTMLInputElement>("#brush-size");
const brushSizeValue = document.querySelector<HTMLElement>("#brush-size-value");
const brushLoadInput = document.querySelector<HTMLInputElement>("#brush-load");
const mixInput = document.querySelector<HTMLInputElement>("#mix-amount");
const mixValue = document.querySelector<HTMLElement>("#mix-amount-value");
const cleanBrushButton = document.querySelector<HTMLButtonElement>("#clean-brush");
const brushLoadValue = document.querySelector<HTMLElement>("#brush-load-value");

if (!canvas || !brushSizeInput || !brushSizeValue || !brushLoadInput || !mixInput || !mixValue || !cleanBrushButton || !brushLoadValue) {
  throw new Error("Missing paint controls.");
}

const paintCanvas = canvas;
const sizeInput = brushSizeInput;
const sizeValue = brushSizeValue;
const loadInput = brushLoadInput;
const blendInput = mixInput;
const blendValue = mixValue;
const rinseButton = cleanBrushButton;
const loadValue = brushLoadValue;
const brush = await loadImageStampBrush("/brush-assets/watercolor-stamp-01-17.png", "/brush-assets/watercolor-paper-texture.jpg");
const engine = new PaintEngine(paintCanvas, 960, 640, brush);
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

function syncBrushSizeControl(): void {
  sizeInput.value = String(engine.getBrushRadius());
  sizeValue.textContent = `${engine.getBrushRadius()}px`;
}

function syncBrushLoadControl(): void {
  const percent = Math.round(engine.getBrushLoad() * 100);
  loadInput.value = String(percent);
  loadValue.textContent = `${percent}%`;
}

function syncMixControl(): void {
  blendInput.value = String(Math.round(engine.getMixAmount() * 100));
  blendValue.textContent = `${Math.round(engine.getMixAmount() * 100)}%`;
}

function setBrushSize(radius: number): void {
  engine.setBrushRadius(radius);
  syncBrushSizeControl();
}

function setMixAmount(value: number): void {
  engine.setMixAmount(value / 100);
  syncMixControl();
}

function setBrushLoad(value: number): void {
  engine.setBrushLoad(value / 100);
  syncBrushLoadControl();
}

syncBrushSizeControl();
syncBrushLoadControl();
syncMixControl();

sizeInput.addEventListener("input", () => {
  setBrushSize(Number(sizeInput.value));
});

loadInput.addEventListener("input", () => {
  setBrushLoad(Number(loadInput.value));
});

blendInput.addEventListener("input", () => {
  setMixAmount(Number(blendInput.value));
});

rinseButton.addEventListener("click", () => {
  engine.cleanBrush();
  syncBrushLoadControl();
  setViewMode("color");
});

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
    syncBrushLoadControl();
    setViewMode("color");
    return;
  }

  switch (event.key.toLowerCase()) {
    case "[":
      setBrushSize(engine.getBrushRadius() - 4);
      break;
    case "]":
      setBrushSize(engine.getBrushRadius() + 4);
      break;
    case "d":
      engine.clear();
      break;
    case "r":
      engine.cleanBrush();
      syncBrushLoadControl();
      setViewMode("color");
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
