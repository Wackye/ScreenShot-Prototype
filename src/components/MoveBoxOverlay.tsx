import { useRef, useState, useEffect } from "react";

interface Props {
  screenshot: string;
  onComplete: (cropped: string) => void;
  onCancel: () => void;
}

/* 最小寬高避免拖到 0 */
const MIN_W = 80;
const MIN_H = 80;

export default function MoveBoxOverlay({ screenshot, onComplete, onCancel }: Props) {
  /* 全螢幕縮圖放置 */
  const imgRef = useRef<HTMLImageElement>(null);

  /* 以中心點 + 寬高為狀態，方便做「對稱縮放」 */
  const [box, setBox] = useState(() => {
    const w = window.innerWidth  / 2;
    const h = window.innerHeight / 2;
    return {
      cx: window.innerWidth  / 2,
      cy: window.innerHeight / 2,
      w,
      h,
    };
  });

  /* ───── 移動整個框 ───── */
  const dragWhole = useRef<{ offX: number; offY: number } | null>(null);

  const onBoxMouseDown = (e: React.MouseEvent) => {
    /* 忽略點到 anchor 的情況（anchor 會停止事件冒泡） */
    if ((e.target as HTMLElement).dataset.handle) return;
    dragWhole.current = { offX: e.clientX - box.cx, offY: e.clientY - box.cy };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragWhole.current) {
      const { offX, offY } = dragWhole.current;
      setBox({ ...box, cx: e.clientX - offX, cy: e.clientY - offY });
    } else if (resize.current) {
      handleResize(e);
    }
  };

  const onMouseUp = () => {
    dragWhole.current = null;
    resize.current = null;
  };

  /* ───── 對稱縮放 ───── */
  type Corner = "nw" | "ne" | "sw" | "se";
  const resize = useRef<{ corner: Corner; startX: number; startY: number } | null>(null);

  const onAnchorDown = (corner: Corner) => (e: React.MouseEvent) => {
    e.stopPropagation();
    resize.current = { corner, startX: e.clientX, startY: e.clientY };
  };

  const handleResize = (e: React.MouseEvent) => {
    if (!resize.current) return;
    const { corner, startX, startY } = resize.current;
    /* 鼠標與起始 anchor 的位移 */
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    /* 依拖拉方向決定增減符號（對稱所以寬高*2，但中心不動） */
    let newW = box.w;
    let newH = box.h;

    if (corner === "nw" || corner === "sw") newW -= dx;
    else                                    newW += dx;

    if (corner === "nw" || corner === "ne") newH -= dy;
    else                                    newH += dy;

    newW = Math.max(MIN_W, newW);
    newH = Math.max(MIN_H, newH);

    setBox({ ...box, w: newW, h: newH });
    /* 更新起點，避免長距離拖動累加誤差 */
    resize.current!.startX = e.clientX;
    resize.current!.startY = e.clientY;
  };

  /* ───── Esc / Enter ───── */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  crop();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  /* ───── 裁切 ───── */
  const crop = () => {
    if (!imgRef.current) return;

    const view = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth  / view.width;
    const scaleY = imgRef.current.naturalHeight / view.height;

    const sx = (box.cx - box.w / 2 - view.x) * scaleX;
    const sy = (box.cy - box.h / 2 - view.y) * scaleY;
    const sw = box.w * scaleX;
    const sh = box.h * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
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
        onComplete(url);
      }, "image/png");
    };
    tmp.src = screenshot;
  };

  /* ───── UI ───── */
  return (
    <div
      style={{ position:"fixed",inset:0,zIndex:9999,cursor: dragWhole.current ? "grabbing":"default",
               userSelect:"none" }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* 背景截圖 */}
      <img
        ref={imgRef}
        src={screenshot}
        style={{ width:"100%",height:"100%",objectFit:"cover",opacity:.8,pointerEvents:"none" }}
        draggable={false}
      />

      {/* 暗色遮罩 */}
      <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)" }}/>

      {/* 可拖曳＋縮放的框 */}
      <div
        onMouseDown={onBoxMouseDown}
        onDoubleClick={crop}
        style={{
          position:"absolute",
          left: box.cx - box.w/2,
          top:  box.cy - box.h/2,
          width: box.w,
          height: box.h,
          border:"2px solid #22d3ee",
          background:"rgba(34,211,238,.25)",
          boxShadow:"0 0 0 9999px rgba(0,0,0,.45)",
        }}
      >
        {/* 四角 anchor */}
        {(["nw","ne","sw","se"] as Corner[]).map(c => {
          const anchorStyle: React.CSSProperties = {
            position:"absolute",
            width:8,height:8,
            background:"#22d3ee",
            border:"1px solid #fff",
            cursor: `${c}-resize`,
          };
          if (c.includes("n")) anchorStyle.top  = -4;
          if (c.includes("s")) anchorStyle.bottom = -4;
          if (c.includes("w")) anchorStyle.left = -4;
          if (c.includes("e")) anchorStyle.right = -4;

          return (
            <div key={c}
                 data-handle
                 onMouseDown={onAnchorDown(c)}
                 style={anchorStyle}/>
          );
        })}
      </div>

      {/* Cancel 按鈕 */}
      <button
        onClick={onCancel}
        style={{ position:"absolute",top:16,right:16,padding:"4px 10px",
                 fontSize:12,borderRadius:4,background:"#1f2937",color:"#fff",
                 border:"none",cursor:"pointer" }}>
        Cancel (Esc)
      </button>
    </div>
  );
}
