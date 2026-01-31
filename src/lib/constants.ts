import type { WebGLRendererParameters } from "three";

export const RENDERER_SETTINGS: WebGLRendererParameters = {
	preserveDrawingBuffer: true,
	alpha: true,
	antialias: false,
	powerPreference: "high-performance",
};

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
