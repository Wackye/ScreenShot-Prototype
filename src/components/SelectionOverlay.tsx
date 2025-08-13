import { useState, useRef, MouseEvent } from "react";

interface Props {
  screenshot: string;                    // dataURL
  onComplete: (cropped: string) => void; // 回傳裁切後 dataURL
  onCancel: () => void;
}

export default function SelectionOverlay({ screenshot, onComplete, onCancel }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null); // 即時框
  const start = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onMouseDown = (e: MouseEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    setRect(new DOMRect(e.clientX, e.clientY, 0, 0));
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!start.current) return;
    const { x: sx, y: sy } = start.current;
    const x = Math.min(sx, e.clientX);
    const y = Math.min(sy, e.clientY);
    const w = Math.abs(e.clientX - sx);
    const h = Math.abs(e.clientY - sy);
    setRect(new DOMRect(x, y, w, h));
  };

  const onMouseUp = () => {
    if (!rect || !imgRef.current) {
      start.current = null;
      return;
    }

    // 計算裝填比例（img 可能縮放）
    const img = imgRef.current;
    const box = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / box.width;
    const scaleY = img.naturalHeight / box.height;

    const sx = (rect.x - box.x) * scaleX;
    const sy = (rect.y - box.y) * scaleY;
    const sw = rect.width * scaleX;
    const sh = rect.height * scaleY;

    // 用 Canvas 裁切
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    const tmp = new Image();
    tmp.onload = () => {
      ctx.drawImage(tmp, sx, sy, sw, sh, 0, 0, sw, sh);
      const croppedUrl = canvas.toDataURL("image/png");

      // 複製到剪貼簿
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
        }
      }, "image/png");

      onComplete(croppedUrl);
    };
    tmp.src = screenshot;
  };

  return (
    <div
  style={{
    position: "fixed",
    inset: 0,              // 等同 top:0 right:0 bottom:0 left:0
    zIndex: 9999,
    cursor: "crosshair",
    userSelect: "none",
  }}
  onMouseDown={onMouseDown}
  onMouseMove={onMouseMove}
  onMouseUp={onMouseUp}
  onContextMenu={(e) => e.preventDefault()}
>
  {/* 底圖 */}  
  <img
    ref={imgRef}
    src={screenshot}
    style={{
      width: "100%",
      height: "100%",
      objectFit: "cover",
      opacity: 0.8,         // 80% 透明度
      pointerEvents: "none",
    }}
    draggable={false}
  />

  {/* 深色遮罩 */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      pointerEvents: "none",
    }}
  />

  {/* 即時矩形 */}
  {rect && (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: "2px solid #2dd4bf",   // cyan-300
        background: "rgba(45,212,191,0.2)",
        pointerEvents: "none",
      }}
    />
  )}

  {/* Cancel Button */}
  <button
    onClick={onCancel}
    style={{
      position: "absolute",
      top: "1rem",
      right: "1rem",
      padding: "0.4rem 0.8rem",
      fontSize: "0.8rem",
      borderRadius: "0.25rem",
      background: "#1f2937",  // gray-800
      color: "#fff",
    }}
  >
    Cancel (Esc)
  </button>
</div>

  );
}
