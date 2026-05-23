import type { RenderChainParams } from "@/effects/renderEffectChain";

import { renderEffectChain } from "@/effects/renderEffectChain";
import passthroughFrag from "@/effects/shaders/common/passthrough.frag";
import passthroughVert from "@/effects/shaders/common/passthrough.vert";
import type { EffectInstance } from "@/effects/types";
import {
	createPassthroughUniforms,
	createReglContext,
} from "@/engine/reglContext";
import { LOSSY_EXPORT_QUALITY, MIME_TO_EXT } from "@/lib/constants";

export interface ExportOptions {
	bitmap: ImageBitmap;
	dimensions: { width: number; height: number };
	effects: readonly EffectInstance[];
	mimeType: string;
	fileName: string;
	time: number;
}

/**
 * Exports the current image with all active effects applied at full resolution.
 * Creates a dedicated off-screen regl context so the preview pipeline is
 * untouched, then runs the same effect chain against full-resolution FBOs.
 */
export function exportImage(options: ExportOptions): Promise<void> {
	const { bitmap, dimensions, effects, mimeType, fileName, time } = options;
	const { width, height } = dimensions;

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	// preserveDrawingBuffer: WebGL may clear the drawing buffer after
	// compositing; toBlob is async and reads pixels after the frame, so
	// the buffer must survive until the callback fires.
	const ctx = createReglContext(canvas, { preserveDrawingBuffer: true });

	const texture = ctx.createImageTexture(bitmap);
	const fbos = [
		ctx.createFramebuffer(width, height),
		ctx.createFramebuffer(width, height),
	] as const;

	const commandCache: RenderChainParams["commandCache"] = new Map();

	const blit = ctx.createScreenCommand({
		vertexShader: passthroughVert,
		fragmentShader: passthroughFrag,
		uniforms: createPassthroughUniforms(ctx),
	});

	// Idempotent: a late toBlob callback can fire after the timeout has already
	// torn things down, and destroying regl handles twice throws.
	let cleaned = false;
	const cleanup = () => {
		if (cleaned) return;
		cleaned = true;
		texture.destroy();
		fbos[0].destroy();
		fbos[1].destroy();
		ctx.destroy();
	};

	const ext = MIME_TO_EXT[mimeType] || "png";
	const quality = mimeType === "image/png" ? undefined : LOSSY_EXPORT_QUALITY;

	try {
		const finalTarget = renderEffectChain({
			ctx,
			texture,
			effects,
			fbos,
			commandCache,
			resolution: [width, height],
			time,
		});

		blit({
			u_texture: finalTarget,
			u_resolution: [width, height],
			u_time: 0,
			viewport: { x: 0, y: 0, width, height },
		});
	} catch (error) {
		cleanup();
		return Promise.reject(error);
	}

	return new Promise((resolve, reject) => {
		// Guard against browsers that silently drop the toBlob callback on context loss.
		const timer = setTimeout(() => {
			cleanup();
			reject(new Error("Export timed out"));
		}, 30_000);

		canvas.toBlob(
			(blob) => {
				clearTimeout(timer);
				if (!blob) {
					cleanup();
					reject(new Error("Failed to create blob for export"));
					return;
				}

				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				try {
					link.href = url;
					link.download = `${fileName}__corrpt.${ext}`;
					document.body.appendChild(link);
					link.click();
					resolve();
				} catch (error) {
					reject(error);
				} finally {
					if (link.isConnected) {
						document.body.removeChild(link);
					}
					URL.revokeObjectURL(url);
					cleanup();
				}
			},
			mimeType,
			quality,
		);
	});
}
