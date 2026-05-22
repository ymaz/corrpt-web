import type { DrawCommand, Framebuffer2D, Texture2D } from "regl";

import { renderEffectChain } from "@/effects/renderEffectChain";
import type { EffectInstance } from "@/effects/types";
import type { ReglContext } from "@/engine/reglContext";

interface CreateEffectChainRendererOptions {
	ctx: ReglContext;
}

export interface EffectChainRenderer {
	setImage: (bitmap: ImageBitmap | null) => void;
	setEffects: (effects: readonly EffectInstance[]) => void;
	resize: (width: number, height: number) => void;
	/**
	 * Runs the chain and returns the final output suitable for sampling.
	 * Returns null when there's no image or the FBOs aren't sized yet.
	 */
	renderFrame: (time: number) => Texture2D | Framebuffer2D | null;
	dispose: () => void;
}

function createFramebufferPair(
	ctx: ReglContext,
	width: number,
	height: number,
): readonly [Framebuffer2D, Framebuffer2D] {
	return [
		ctx.createFramebuffer(width, height),
		ctx.createFramebuffer(width, height),
	] as const;
}

function haveEffectInstanceIdsChanged(
	currentEffects: readonly EffectInstance[],
	nextEffects: readonly EffectInstance[],
): boolean {
	if (currentEffects.length !== nextEffects.length) return true;
	const currentIds = new Set(currentEffects.map((e) => e.instanceId));
	return nextEffects.some((e) => !currentIds.has(e.instanceId));
}

export function createEffectChainRenderer({
	ctx,
}: CreateEffectChainRendererOptions): EffectChainRenderer {
	let texture: Texture2D | null = null;
	let effects: readonly EffectInstance[] = [];
	let fbos: readonly [Framebuffer2D, Framebuffer2D] | null = null;
	let width = 0;
	let height = 0;
	let disposed = false;

	const commandCache = new Map<string, DrawCommand>();

	const disposeFramebuffers = () => {
		if (!fbos) return;
		fbos[0].destroy();
		fbos[1].destroy();
		fbos = null;
	};

	const disposeTexture = () => {
		if (!texture) return;
		texture.destroy();
		texture = null;
	};

	// regl DrawCommands have no public destroy method — their shader programs
	// are cached by the regl context and released only when the context itself
	// is destroyed. Since all instances of a given effectId share the same
	// shader source, regl reuses the same program across them, so the practical
	// memory cost of orphaned commands is bounded by the number of distinct
	// effect definitions, not the number of instances created over a session.
	const evictInactiveCommands = () => {
		const activeSet = new Set(effects.map((e) => e.instanceId));
		for (const id of commandCache.keys()) {
			if (!activeSet.has(id)) {
				commandCache.delete(id);
			}
		}
	};

	return {
		setImage(bitmap) {
			if (disposed) return;
			disposeTexture();
			texture = bitmap ? ctx.createImageTexture(bitmap) : null;
		},

		setEffects(nextEffects) {
			if (disposed) return;
			if (nextEffects === effects) return;
			const idsChanged = haveEffectInstanceIdsChanged(effects, nextEffects);
			effects = nextEffects;
			if (idsChanged) {
				evictInactiveCommands();
			}
		},

		resize(nextWidth, nextHeight) {
			if (disposed) return;
			if (fbos && width === nextWidth && height === nextHeight) return;

			width = nextWidth;
			height = nextHeight;

			disposeFramebuffers();
			fbos = createFramebufferPair(ctx, width, height);
		},

		renderFrame(time) {
			if (disposed || !texture) return null;
			if (width === 0 || height === 0) return null;

			if (effects.length === 0) {
				return texture;
			}

			if (!fbos) {
				fbos = createFramebufferPair(ctx, width, height);
			}

			return renderEffectChain({
				ctx,
				texture,
				effects,
				fbos,
				commandCache,
				resolution: [width, height],
				time,
			});
		},

		dispose() {
			if (disposed) return;
			disposed = true;
			disposeFramebuffers();
			disposeTexture();
			commandCache.clear();
		},
	};
}
