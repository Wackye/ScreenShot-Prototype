import { useRef, useState, useEffect } from "react";

/* ---------- 參數 ---------- */
const NAV_W = 240;
const NAV_H = 150;

interface Props {
  screenshot: string;
  onComplete: (png: string) => void;
  onCancel: () => void;
}

export default function PipDragOverlay({ screenshot, onComplete, onCancel }: Props) {
  /* 導航器固定右下角 */
  const navX = window.innerWidth  - NAV_W - 16;
  const navY = window.innerHeight - NAV_H - 16;

  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);

  const [sel, setSel] = useState({ x: 0, y: 0, w: 0, h: 0 });  // 選取框
  const startPos = useRef<{ x: number; y: number } | null>(null);

  /* ─── 事件 ─── */
  const down = (e: React.MouseEvent) => {
    const inNav = e.clientX >= navX && e.clientX <= navX + NAV_W &&
                  e.clientY >= navY && e.clientY <= navY + NAV_H;
    if (!inNav) return;                    // 只在導航器區域啟動
    setDragging(true);
    startPos.current = { x: e.clientX - navX, y: e.clientY - navY };
    setSel({ x: 0, y: 0, w: 0, h: 0 });
  };

  const move = (e: React.MouseEvent) => {
    if (!dragging || !startPos.current) return;
    const curX = e.clientX - navX;
    const curY = e.clientY - navY;
    const { x: sx, y: sy } = startPos.current;
    const x = Math.min(sx, curX);
    const y = Math.min(sy, curY);
    const w = Math.abs(curX - sx);
    const h = Math.abs(curY - sy);
    setSel({ x, y, w, h });
  };

  const up = () => {
    if (dragging && sel.w > 4 && sel.h > 4) crop();
    setDragging(false);
    startPos.current = null;
  };

  /* ─── Esc 取消 / Enter 裁切 ─── */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && sel.w > 4 && sel.h > 4) crop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  /* ─── 裁切 ─── */
  const crop = () => {
    if (!imgRef.current) return;
    const scaleX = imgRef.current.naturalWidth  / NAV_W;
    const scaleY = imgRef.current.naturalHeight / NAV_H;

    const sx = sel.x * scaleX;
    const sy = sel.y * scaleY;
    const sw = sel.w * scaleX;
    const sh = sel.h * scaleY;

    const c = document.createElement("canvas");
    c.width = sw; c.height = sh;
    const ctx = c.getContext("2d")!;
    const tmp = new Image();
    tmp.onload = () => {
      ctx.drawImage(tmp, sx, sy, sw, sh, 0, 0, sw, sh);
      const url = c.toDataURL("image/png");
      c.toBlob(async (b) => {
        if (b) await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
        onComplete(url);
      }, "image/png");
    };
    tmp.src = screenshot;
  };

  /* ─── UI ─── */
  return (
    <div
      style={{ position:"fixed",inset:0,zIndex:9999,userSelect:"none" }}
      onMouseDown={down} onMouseMove={move} onMouseUp={up}
    >
      {/* 背景遮罩 */}
      <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)" }} />

      {/* 導航器縮圖 */}
      <div style={{ position:"absolute",left:navX,top:navY,width:NAV_W,height:NAV_H,
                    border:"2px solid #e2e8f0",background:"#000",overflow:"hidden" }}>
        <img ref={imgRef} src={screenshot}
             style={{ width:NAV_W,height:NAV_H,objectFit:"cover",filter:"brightness(.9)" }}
             draggable={false} />
        {/* 動態選取框 */}
        {sel.w > 2 && sel.h > 2 && (
          <div style={{
            position:"absolute",left:sel.x,top:sel.y,width:sel.w,height:sel.h,
            border:"2px solid #22d3ee",background:"rgba(34,211,238,.25)"
          }}/>
        )}
      </div>

      {/* Cancel */}
      <button onClick={onCancel}
        style={{ position:"absolute",top:16,right:16,padding:"4px 10px",
                 fontSize:12,borderRadius:4,background:"#1f2937",color:"#fff",
                 border:"none",cursor:"pointer" }}>
        Cancel (Esc)
      </button>
    </div>
  );
}
