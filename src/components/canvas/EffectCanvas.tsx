import { useCallback, useEffect, useRef, useState } from "react";

import { CanvasErrorBoundary } from "@/components/canvas/CanvasErrorBoundary";
import "@/effects/definitions";
import passthroughFrag from "@/effects/shaders/common/passthrough.frag";
import passthroughVert from "@/effects/shaders/common/passthrough.vert";
import {
	createEffectChainRenderer,
	type EffectChainRenderer,
} from "@/engine/createEffectChainRenderer";
import {
	createPassthroughUniforms,
	createReglContext,
	type ReglContext,
} from "@/engine/reglContext";
import { getTime, setTime, useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

interface EffectCanvasProps {
	className?: string;
}

// Cap the preview FBO at 2× CSS pixels so a huge image displayed in a small
// viewport doesn't drag the GPU. Export always uses the full image resolution.
function computePreviewSize(
	imageW: number,
	imageH: number,
	cssW: number,
	cssH: number,
	dpr: number,
): { previewW: number; previewH: number } {
	const capW = Math.round(cssW * dpr * 2);
	const capH = Math.round(cssH * dpr * 2);
	const scale = Math.min(capW / imageW, capH / imageH, 1);
	return {
		previewW: Math.max(1, Math.round(imageW * scale)),
		previewH: Math.max(1, Math.round(imageH * scale)),
	};
}

// Letterbox the image inside the canvas: fit by the tighter aspect axis,
// centered. Returns the on-screen rectangle in canvas pixels.
function fittedViewport(
	imageW: number,
	imageH: number,
	canvasW: number,
	canvasH: number,
): { x: number; y: number; width: number; height: number } {
	const imageAspect = imageW / imageH;
	const canvasAspect = canvasW / canvasH;
	let w: number;
	let h: number;
	if (imageAspect > canvasAspect) {
		w = canvasW;
		h = Math.round(canvasW / imageAspect);
	} else {
		h = canvasH;
		w = Math.round(canvasH * imageAspect);
	}
	return {
		x: Math.round((canvasW - w) / 2),
		y: Math.round((canvasH - h) / 2),
		width: w,
		height: h,
	};
}

function EffectCanvasInner({ className }: EffectCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const ctxRef = useRef<ReglContext | null>(null);
	const rendererRef = useRef<EffectChainRenderer | null>(null);
	const blitRef = useRef<ReturnType<ReglContext["createScreenCommand"]> | null>(
		null,
	);
	const frameRequestRef = useRef<number | null>(null);
	const lastTsRef = useRef<number | null>(null);
	const fittedViewportRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

	// Surface async init errors to the error boundary by rethrowing during render.
	const [initError, setInitError] = useState<Error | null>(null);
	if (initError) throw initError;

	// Draws one frame at the given time. Synchronous, so callers can repaint
	// within the same tick — e.g. on resize, where reassigning canvas.width
	// clears the drawing buffer and a deferred rAF would leave one frame of
	// empty canvas visible (a flash).
	const drawFrame = useCallback((time: number) => {
		const ctx = ctxRef.current;
		const renderer = rendererRef.current;
		const blit = blitRef.current;
		if (!ctx || !renderer || !blit) return;

		const output = renderer.renderFrame(time);
		const fv = fittedViewportRef.current;

		ctx.clear({ color: [0.102, 0.102, 0.102, 1], depth: 1 });

		if (output && fv.width > 0 && fv.height > 0) {
			blit({
				u_texture: output,
				u_resolution: [fv.width, fv.height],
				u_time: time,
				viewport: fv,
			});
		}
	}, []);

	const invalidate = useCallback(() => {
		if (frameRequestRef.current !== null) return;
		frameRequestRef.current = requestAnimationFrame((ts) => {
			frameRequestRef.current = null;
			const dt =
				lastTsRef.current === null ? 0 : (ts - lastTsRef.current) / 1000;
			lastTsRef.current = ts;
			const time = getTime() + dt;
			setTime(time);
			drawFrame(time);
		});
	}, [drawFrame]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let ctx: ReglContext;
		try {
			ctx = createReglContext(canvas);
		} catch (err) {
			setInitError(err instanceof Error ? err : new Error(String(err)));
			return;
		}
		const renderer = createEffectChainRenderer({ ctx });
		const blit = ctx.createScreenCommand({
			vertexShader: passthroughVert,
			fragmentShader: passthroughFrag,
			uniforms: createPassthroughUniforms(ctx),
		});
		ctxRef.current = ctx;
		rendererRef.current = renderer;
		blitRef.current = blit;

		renderer.setImage(useImageStore.getState().bitmap);
		renderer.setEffects(useEffectStore.getState().effects);

		const sync = () => {
			const { bitmap, dimensions } = useImageStore.getState();
			if (!bitmap || !dimensions) {
				fittedViewportRef.current = { x: 0, y: 0, width: 0, height: 0 };
				drawFrame(getTime());
				return;
			}
			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const cssW = Math.max(1, Math.round(rect.width));
			const cssH = Math.max(1, Math.round(rect.height));
			const drawW = Math.max(1, Math.round(cssW * dpr));
			const drawH = Math.max(1, Math.round(cssH * dpr));
			if (canvas.width !== drawW) canvas.width = drawW;
			if (canvas.height !== drawH) canvas.height = drawH;

			const { previewW, previewH } = computePreviewSize(
				dimensions.width,
				dimensions.height,
				cssW,
				cssH,
				dpr,
			);
			renderer.resize(previewW, previewH);
			fittedViewportRef.current = fittedViewport(
				dimensions.width,
				dimensions.height,
				drawW,
				drawH,
			);
			drawFrame(getTime());
		};

		const ro = new ResizeObserver(sync);
		ro.observe(canvas);

		// Size the FBOs/viewport before the first frame (so the initial render
		// draws content, not a black flash) and keep them correct when only the
		// device pixel ratio changes — e.g. dragging the window to a display with a
		// different DPR, which a ResizeObserver misses and which would otherwise
		// leave the backing store at the old resolution and blur the preview. The
		// resolution query is pinned to one ratio, so re-sync and re-arm on change.
		let dprQuery: MediaQueryList | null = null;
		const handleDprChange = () => {
			dprQuery?.removeEventListener("change", handleDprChange);
			dprQuery = window.matchMedia(
				`(resolution: ${window.devicePixelRatio}dppx)`,
			);
			dprQuery.addEventListener("change", handleDprChange);
			sync();
		};
		handleDprChange();

		const unsubImage = useImageStore.subscribe((state, prev) => {
			if (state.bitmap !== prev.bitmap) {
				renderer.setImage(state.bitmap);
				sync();
			}
		});
		const unsubEffects = useEffectStore.subscribe((state, prev) => {
			if (state.effects !== prev.effects) {
				renderer.setEffects(state.effects);
				invalidate();
			}
		});

		return () => {
			ro.disconnect();
			dprQuery?.removeEventListener("change", handleDprChange);
			unsubImage();
			unsubEffects();
			if (frameRequestRef.current !== null) {
				cancelAnimationFrame(frameRequestRef.current);
				frameRequestRef.current = null;
			}
			renderer.dispose();
			ctx.destroy();
			ctxRef.current = null;
			rendererRef.current = null;
			blitRef.current = null;
		};
	}, [invalidate, drawFrame]);

	// The canvas needs explicit fill-parent sizing — plain <canvas> defaults to
	// 300×150, and getBoundingClientRect on that is what sizes our FBO and viewport.
	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={{
				display: "block",
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
			}}
		/>
	);
}

export function EffectCanvas({ className }: EffectCanvasProps) {
	const originalUrl = useImageStore((s) => s.originalUrl);
	return (
		<CanvasErrorBoundary resetKey={originalUrl}>
			<EffectCanvasInner className={className} />
		</CanvasErrorBoundary>
	);
}
