import type { WebGLRendererParameters } from "three";

export const RENDERER_SETTINGS: WebGLRendererParameters = {
	alpha: true,
	antialias: false,
	powerPreference: "high-performance",
};

export const EXPORT_RENDERER_SETTINGS: WebGLRendererParameters = {
	...RENDERER_SETTINGS,
	// Required: WebGL may clear the drawing buffer after compositing; toBlob is
	// async and reads pixels after the frame, so the buffer must be preserved.
	preserveDrawingBuffer: true,
};

export const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

export const SUPPORTED_IMAGE_TYPES = Object.keys(MIME_TO_EXT);

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_PIXEL_COUNT = 16_777_216; // 16 MP (~4096²) — GPU memory budget
export const MAX_DIMENSION = 8192; // guards pathological aspect ratios
export const LOSSY_EXPORT_QUALITY = 0.92; // JPEG and WebP re-encode quality
