import type { DrawCommand, Framebuffer2D, Texture2D } from "regl";

import { getEffect } from "@/effects/registry";
import type { EffectDefinition, EffectInstance } from "@/effects/types";
import type { ReglContext } from "@/engine/reglContext";

export interface RenderChainParams {
	ctx: ReglContext;
	texture: Texture2D;
	effects: readonly EffectInstance[];
	fbos: readonly [Framebuffer2D, Framebuffer2D];
	commandCache: Map<string, DrawCommand>;
	resolution: readonly [number, number];
	time: number;
}

// Keyed by effectId; built once per definition, never rebuilt.
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

function buildCommand(ctx: ReglContext, def: EffectDefinition): DrawCommand {
	const uniforms: Record<string, unknown> = {
		u_texture: ctx.regl.prop<
			{ u_texture: Texture2D | Framebuffer2D },
			"u_texture"
		>("u_texture"),
		u_resolution: ctx.regl.prop<
			{ u_resolution: [number, number] },
			"u_resolution"
		>("u_resolution"),
		u_time: ctx.regl.prop<{ u_time: number }, "u_time">("u_time"),
	};
	for (const p of def.parameters) {
		const name = `u_${p.name}`;
		uniforms[name] = ctx.regl.prop<Record<string, unknown>, string>(name);
	}
	return ctx.createPassCommand({
		vertexShader: def.vertexShader,
		fragmentShader: def.fragmentShader,
		uniforms,
	});
}

/**
 * Runs the multi-pass FBO effect chain and returns the final output.
 * Pure rendering function — callable from preview and export paths.
 *
 * Note: when no effects run, returns the input Texture2D; otherwise the
 * final Framebuffer2D. Both are valid sampler2D inputs in regl, so the
 * caller can blit either uniformly.
 */
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

		let cmd = commandCache.get(effect.instanceId);
		if (!cmd) {
			cmd = buildCommand(ctx, def);
			commandCache.set(effect.instanceId, cmd);
		}

		const inputTexture: Texture2D | Framebuffer2D =
			passCount === 0 ? texture : fbos[readIndex];

		const props: Record<string, unknown> = {
			u_texture: inputTexture,
			u_resolution: resolution,
			u_time: time,
		};
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
						props[name] = [p.default[0], p.default[1]];
						break;
					case "color":
						props[name] = [p.default[0], p.default[1], p.default[2]];
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
				case "vec2": {
					const v = val as [number, number];
					props[name] = [v[0], v[1]];
					break;
				}
				case "color": {
					const c = val as [number, number, number];
					props[name] = [c[0], c[1], c[2]];
					break;
				}
			}
		}

		const writeIndex = 1 - readIndex;
		cmd({ ...props, framebuffer: fbos[writeIndex] });

		readIndex = writeIndex;
		passCount++;
	}

	return passCount > 0 ? fbos[readIndex] : texture;
}
