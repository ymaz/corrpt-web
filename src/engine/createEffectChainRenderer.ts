import type { Framebuffer2D, Texture2D } from "regl";

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
	/** null when there's no image or the FBOs aren't sized yet. */
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

function haveActiveEffectIdsChanged(
	currentEffects: readonly EffectInstance[],
	nextEffects: readonly EffectInstance[],
): boolean {
	const currentIds = new Set(currentEffects.map((e) => e.effectId));
	const nextIds = new Set(nextEffects.map((e) => e.effectId));
	if (currentIds.size !== nextIds.size) return true;
	for (const id of nextIds) {
		if (!currentIds.has(id)) return true;
	}
	return false;
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

	// Cache keyed by effectId — collapses to N entries where N = distinct effect
	// types. Upper bound: |registered effects|. regl has no DrawCommand.destroy;
	// commands are reclaimed only with the context.
	const commandCache = new Map<
		string,
		{ cmd: import("regl").DrawCommand; props: Record<string, unknown> }
	>();

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

	const evictInactiveCommands = () => {
		const activeSet = new Set(effects.map((e) => e.effectId));
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
			const idsChanged = haveActiveEffectIdsChanged(effects, nextEffects);
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
