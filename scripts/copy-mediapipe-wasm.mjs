// Menyalin file WASM MediaPipe ke public/ agar dilayani dari aplikasi sendiri (Bagian I.1).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
const src = 'node_modules/@mediapipe/tasks-vision/wasm';
const dest = 'public/mediapipe/wasm';
if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log('[obah-anyar] WASM MediaPipe disalin ke', dest);
} else {
  console.warn('[obah-anyar] WASM MediaPipe belum ada, lewati.');
}
