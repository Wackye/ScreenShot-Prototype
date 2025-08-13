// Minimal ImageCapture type declarations for TypeScript
// This API is supported in modern Chromium-based browsers and Safari, but not typed in lib.dom.d.ts

declare class ImageCapture {
  constructor(videoTrack: MediaStreamTrack);
  track: MediaStreamTrack;
  grabFrame(): Promise<ImageBitmap>;
  takePhoto(photoSettings?: unknown): Promise<Blob>;
}

