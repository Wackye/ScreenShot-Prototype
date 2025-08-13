import { useRef, useState, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

interface Props {
  screenshot: string;                     // 全螢幕 dataURL
  onComplete: (cropped: string) => void;  // 回傳裁切後 dataURL
  onCancel: () => void;
}

/* 導航器尺寸（你可以改成 180 × 120 等） */
const NAV_W = 240;
const NAV_H = 150;

/* 在導航器裡的選取框初始大小（占 50%） */
const BOX_RATIO = 0.5;

export default function PipOverlay({ screenshot, onComplete, onCancel }: Props) {
  const imgRef      = useRef<HTMLImageElement>(null);
  const [navBox] = useState({              // 導航框位置（固定右下）
    x: window.innerWidth  - NAV_W - 16,
    y: window.innerHeight - NAV_H - 16,
  });
  const [selBox, setSelBox] = useState({              // 選取框 ← 可拖曳
    x: (1 - BOX_RATIO) * NAV_W / 2,
    y: (1 - BOX_RATIO) * NAV_H / 2,
    w: NAV_W * BOX_RATIO,
    h: NAV_H * BOX_RATIO,
  });
  const drag = useRef<{ offX: number; offY: number } | null>(null);

  /* ───────── 拖曳選取框 ───────── */
  const onMouseDown = (e: ReactMouseEvent) => {
    const box = (e.target as HTMLElement).closest("#selbox");
    if (!box) return;
    drag.current = { offX: e.clientX - box.getBoundingClientRect().left,
                     offY: e.clientY - box.getBoundingClientRect().top };
    e.stopPropagation();
  };

  const onMouseMove = (e: ReactMouseEvent) => {
    if (!drag.current) return;
    const { offX, offY } = drag.current;
    let nx = e.clientX - offX - navBox.x;
    let ny = e.clientY - offY - navBox.y;
    /* 侷限在導航器內 */
    nx = Math.max(0, Math.min(nx, NAV_W - selBox.w));
    ny = Math.max(0, Math.min(ny, NAV_H - selBox.h));
    setSelBox({ ...selBox, x: nx, y: ny });
  };

  const onMouseUp = () => (drag.current = null);

  /* ───────── 快捷鍵 ───────── */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  crop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const onDoubleClick = () => crop();

  /* ───────── 裁切 ───────── */
  const crop = () => {
    if (!imgRef.current) return;

    const thumbScaleX = imgRef.current.naturalWidth  / NAV_W;
    const thumbScaleY = imgRef.current.naturalHeight / NAV_H;

    const sx = selBox.x * thumbScaleX;
    const sy = selBox.y * thumbScaleY;
    const sw = selBox.w * thumbScaleX;
    const sh = selBox.h * thumbScaleY;

    const canvas = document.createElement("canvas");
    canvas.width  = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    const tmp = new Image();
    tmp.onload = () => {
      ctx.drawImage(tmp, sx, sy, sw, sh, 0, 0, sw, sh);
      const url = canvas.toDataURL("image/png");
      canvas.toBlob(async (b) => {
        if (b) await navigator.clipboard.write([
          new ClipboardItem({ "image/png": b }),
        ]);
        onComplete(url);   // 傳回裁切結果 → App 預覽
      }, "image/png");
    };
    tmp.src = screenshot;
  };

  /* ───────── UI ───────── */
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        cursor: drag.current ? "grabbing" : "default",
        userSelect: "none",
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* 淡灰遮罩全幕，點不到 */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,.35)",
          pointerEvents: "none",
        }}
      />

      {/* ───── 導航器（右下）───── */}
      <div
        style={{
          position: "absolute",
          left: navBox.x,
          top:  navBox.y,
          width: NAV_W,
          height: NAV_H,
          border: "2px solid #e2e8f0",
          background: "#000",
          overflow: "hidden",
        }}
      >
        {/* 縮圖 (full screenshot) */}
        <img
          ref={imgRef}
          src={screenshot}
          style={{
            width: NAV_W, height: NAV_H, objectFit: "cover",
            filter: "brightness(.9)",
            pointerEvents: "none",
          }}
          draggable={false}
        />

        {/* 選取框 */}
        <div
          id="selbox"
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          style={{
            position: "absolute",
            left: selBox.x,
            top:  selBox.y,
            width: selBox.w,
            height: selBox.h,
            border: "2px solid #22d3ee",
            background: "rgba(34,211,238,.25)",
            cursor: "grab",
          }}
        />
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          padding: "4px 10px",
          fontSize: 12,
          borderRadius: 4,
          background: "#1f2937",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Cancel (Esc)
      </button>
    </div>
  );
}
