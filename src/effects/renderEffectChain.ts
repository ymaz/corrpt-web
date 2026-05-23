import type { DrawCommand, Framebuffer2D, Texture2D } from "regl";

import { getEffect } from "@/effects/registry";
import type { EffectDefinition, EffectInstance } from "@/effects/types";
import type { ReglContext } from "@/engine/reglContext";

interface CachedCommand {
	cmd: DrawCommand;
	/** Scratch props object mutated in-place every frame — avoids per-frame allocation. */
	props: Record<string, unknown>;
}

export interface RenderChainParams {
	ctx: ReglContext;
	texture: Texture2D;
	effects: readonly EffectInstance[];
	fbos: readonly [Framebuffer2D, Framebuffer2D];
	commandCache: Map<string, CachedCommand>;
	resolution: readonly [number, number];
	time: number;
}

const enumMapCache = new Map<string, Map<string, Map<string, number>>>();

function getEnumMaps(def: EffectDefinition): Map<string, Map<string, number>> {
	let maps = enumMapCache.get(def.id);
	if (!maps) {
		maps = new Map();
		for (const p of def.parameters) {
			if (p.type === "enum") {
				maps.set(p.name, new Map(p.options.map((o, i) => [o.value, i])));
			}
		}
		enumMapCache.set(def.id, maps);
	}
	return maps;
}

function buildCommand(ctx: ReglContext, def: EffectDefinition): CachedCommand {
	const uniforms: Record<string, unknown> = {
		u_texture: ctx.prop("u_texture"),
		u_resolution: ctx.prop("u_resolution"),
		u_time: ctx.prop("u_time"),
	};
	for (const p of def.parameters) {
		const name = `u_${p.name}`;
		uniforms[name] = ctx.prop(name);
	}
	const cmd = ctx.createEffectCommand({
		vertexShader: def.vertexShader,
		fragmentShader: def.fragmentShader,
		uniforms,
	});
	// Pre-allocate scratch props including the framebuffer slot.
	const props: Record<string, unknown> = {
		u_texture: undefined,
		u_resolution: undefined,
		u_time: undefined,
		framebuffer: undefined,
	};
	for (const p of def.parameters) {
		props[`u_${p.name}`] = undefined;
	}
	return { cmd, props };
}

/** Returns the input Texture2D if no effects ran, else the last Framebuffer2D. */
export function renderEffectChain(
	params: RenderChainParams,
): Texture2D | Framebuffer2D {
	const { ctx, texture, effects, fbos, commandCache, resolution, time } =
		params;

	let readIndex = 0;
	let passCount = 0;

	for (const effect of effects) {
		if (!effect.enabled) continue;

		const def = getEffect(effect.effectId);
		if (!def) continue;

		const enumMaps = getEnumMaps(def);

		// Cache keyed by effectId — all instances of the same effect type share
		// one DrawCommand (regl shares the GPU program anyway; this collapses the
		// JS-side cache to N entries where N = distinct effect types in the chain).
		let entry = commandCache.get(effect.effectId);
		if (!entry) {
			entry = buildCommand(ctx, def);
			commandCache.set(effect.effectId, entry);
		}

		const { cmd, props } = entry;

		const inputTexture: Texture2D | Framebuffer2D =
			passCount === 0 ? texture : fbos[readIndex];

		// Mutate scratch props in-place — no per-frame allocation.
		props.u_texture = inputTexture;
		props.u_resolution = resolution;
		props.u_time = time;

		for (const p of def.parameters) {
			const val = effect.parameters[p.name];
			const name = `u_${p.name}`;
			if (val === undefined) {
				switch (p.type) {
					case "bool":
						props[name] = p.default ? 1.0 : 0.0;
						break;
					case "int":
					case "float":
						props[name] = p.default;
						break;
					case "enum":
						props[name] = enumMaps.get(p.name)?.get(p.default) ?? 0;
						break;
					case "vec2":
						props[name] = (p.default as readonly number[]).slice();
						break;
					case "color":
						props[name] = (p.default as readonly number[]).slice();
						break;
				}
				continue;
			}
			switch (p.type) {
				case "bool":
					props[name] = val ? 1.0 : 0.0;
					break;
				case "int":
				case "float":
					props[name] = val;
					break;
				case "enum":
					props[name] = enumMaps.get(p.name)?.get(val as string) ?? 0;
					break;
				case "vec2":
					props[name] = val;
					break;
				case "color":
					props[name] = val;
					break;
			}
		}

		const writeIndex = 1 - readIndex;
		props.framebuffer = fbos[writeIndex];
		cmd(props);

		readIndex = writeIndex;
		passCount++;
	}

	return passCount > 0 ? fbos[readIndex] : texture;
}
