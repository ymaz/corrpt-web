import type { WebGLRendererParameters } from "three";

export const RENDERER_SETTINGS: WebGLRendererParameters = {
	preserveDrawingBuffer: true,
	alpha: true,
	antialias: false,
	powerPreference: "high-performance",
};

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_PIXEL_COUNT = 16_777_216; // 16 MP (~4096²) — GPU memory budget
export const MAX_DIMENSION = 8192; // guards pathological aspect ratios
export const LOSSY_EXPORT_QUALITY = 0.92; // JPEG and WebP re-encode quality
