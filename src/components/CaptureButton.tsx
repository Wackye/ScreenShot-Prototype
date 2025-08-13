import { useState } from "react";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function CaptureButton({ onCapture }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);

      // 1️⃣  要求螢幕分享權限
    // CaptureButton.tsx 內
    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,   // Safari 只接受 boolean；Chrome/Edge 也 OK
        audio: false,  // 省掉麥克風權限提示
    });

      // 2️⃣  抓第一條 video track
      const [track] = stream.getVideoTracks();
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();

      // 3️⃣  畫到 Canvas → 轉成 DataURL
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");

      // 4️⃣  複製到剪貼簿（最佳化流程，可省略）
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      // 5️⃣  通知外層
      onCapture(dataUrl);

  
      // 6️⃣  切斷權限
      track.stop();
    } catch (err) {
      console.error(err);
      alert("⚠️  無法擷取螢幕，請確認權限或瀏覽器支援度");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
      disabled={loading}
    >
      {loading ? "Capturing…" : "Capture screen"}
    </button>
  );
}
