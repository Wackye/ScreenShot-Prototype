import { useState } from "react";
import SelectionOverlay from "./components/SelectionOverlay";
import MoveBoxOverlay   from "./components/MoveBoxOverlay";
import PipOverlay       from "./components/PipOverlay";
import PipDragOverlay   from "./components/PipDragOverlay";   // ⬅️ 新增

async function captureScreen(): Promise<string> {
  const stream  = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const [track] = stream.getVideoTracks();
  const bmp     = await new ImageCapture(track).grabFrame();
  track.stop();

  const c = document.createElement("canvas");
  c.width = bmp.width; c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  return c.toDataURL("image/png");
}

type Mode = "drag" | "box" | "pip" | "pipDrag" | null;   // ← 多了 pipDrag

export default function App() {
  const [mode,    setMode]    = useState<Mode>(null);
  const [rawShot, setRawShot] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const startCapture = async (next: Mode) => {
    try {
      const url = await captureScreen();
      setRawShot(url);
      setMode(next);
    } catch (e) {
      alert("無法擷取螢幕，請檢查權限或瀏覽器支援。");
    }
  };

  const complete = (url: string) => {
    setPreview(url);   // 覆蓋舊圖
    setRawShot(null);
    setMode(null);
  };
  const cancel = () => { setRawShot(null); setMode(null); };

  return (
    <>
      {/* 中央預覽 / 鼓勵字 */}
      <div style={S.center}>
        {preview
          ? <img src={preview} style={S.img}/>
          : <p style={S.hint}>🚀 點下方任意按鈕開始截圖！</p>}
      </div>

      {/* 四種 Overlay */}
      {mode === "drag"    && rawShot && <SelectionOverlay screenshot={rawShot} onComplete={complete} onCancel={cancel}/>}
      {mode === "box"     && rawShot && <MoveBoxOverlay   screenshot={rawShot} onComplete={complete} onCancel={cancel}/>}
      {mode === "pip"     && rawShot && <PipOverlay       screenshot={rawShot} onComplete={complete} onCancel={cancel}/>}
      {mode === "pipDrag" && rawShot && <PipDragOverlay   screenshot={rawShot} onComplete={complete} onCancel={cancel}/>}

      {/* Footer 按鈕列 */}
      <footer style={S.footer}>
        <button style={S.btn} onClick={() => startCapture("drag")}>自由拖曳裁切</button>
        <button style={S.btn} onClick={() => startCapture("box")}>固定方框裁切</button>
        <button style={S.btn} onClick={() => startCapture("pip")}>PiP 導航器裁切</button>
        <button style={S.btn} onClick={() => startCapture("pipDrag")}>PiP-Drag 匡選</button>
      </footer>
    </>
  );
}

/* -------- CSS (inline) -------- */
const S: Record<string, React.CSSProperties> = {
  center: {position:"fixed",inset:0,display:"flex",justifyContent:"center",alignItems:"center",
           flexDirection:"column",pointerEvents:"none"},
  img:    {maxWidth:"80vw",maxHeight:"80vh",border:"1px solid #cbd5e1",borderRadius:6,
           boxShadow:"0 4px 16px rgba(0,0,0,.15)"},
  hint:   {fontSize:20,color:"#64748b",fontFamily:"system-ui",margin:0},
  footer: {position:"fixed",bottom:0,left:0,width:"100%",padding:"12px 0",display:"flex",
           justifyContent:"center",gap:16,background:"rgba(255,255,255,.9)",
           backdropFilter:"blur(6px)",boxShadow:"0 -2px 6px rgba(0,0,0,.1)"},
  btn:    {padding:"10px 18px",fontSize:16,border:"none",borderRadius:6,
           background:"#2563eb",color:"#fff",cursor:"pointer"},
};
