import type { DrawCommand, Framebuffer2D, Texture2D } from "regl";

import { getEffect } from "@/effects/registry";
import type {
	EffectDefinition,
	EffectInstance,
	EffectPass,
} from "@/effects/types";
import type { ReglContext } from "@/engine/reglContext";

interface ResolvedPass {
	vertexShader: string;
	fragmentShader: string;
	input: "previous" | "source";
}

interface CachedPass {
	cmd: DrawCommand;
	/** Scratch props object mutated in-place every frame — avoids per-frame allocation. */
	props: Record<string, unknown>;
	input: "previous" | "source";
	/** True when this pass's shader samples `u_source` (the effect's input). */
	bindSource: boolean;
	/** Aux-texture names this pass actually references (bound as `u_<name>`). */
	textureNames: string[];
}

export interface CachedEffect {
	passes: CachedPass[];
}

export interface RenderChainParams {
	ctx: ReglContext;
	texture: Texture2D;
	effects: readonly EffectInstance[];
	fbos: readonly [Framebuffer2D, Framebuffer2D];
	/**
	 * Intra-effect ping-pong targets, required only when a chain contains a
	 * multi-pass effect. May be null for single-pass-only chains.
	 */
	scratchFbos: readonly [Framebuffer2D, Framebuffer2D] | null;
	commandCache: Map<string, CachedEffect>;
	/** Aux textures, keyed `${effectId}:${name}`. Owned and disposed by the caller. */
	auxTextureCache: Map<string, Texture2D>;
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

function resolvePasses(def: EffectDefinition): ResolvedPass[] {
	const source: (EffectPass | { fragmentShader: string })[] =
		def.passes && def.passes.length > 0
			? def.passes
			: [{ fragmentShader: def.fragmentShader }];
	return source.map((p) => ({
		vertexShader: ("vertexShader" in p && p.vertexShader) || def.vertexShader,
		fragmentShader: p.fragmentShader,
		input: ("input" in p && p.input) || "previous",
	}));
}

/** Whole-token match so `u_mask` doesn't match `u_mask2`. */
function usesUniform(shaderSource: string, uniform: string): boolean {
	return new RegExp(`\\b${uniform}\\b`).test(shaderSource);
}

function buildEffectCommand(
	ctx: ReglContext,
	def: EffectDefinition,
): CachedEffect {
	const textureDefs = def.textures ?? [];
	const passes = resolvePasses(def).map((pass): CachedPass => {
		const shaderSource = `${pass.fragmentShader}\n${pass.vertexShader}`;
		const bindSource = usesUniform(shaderSource, "u_source");
		const textureNames = textureDefs
			.map((t) => t.name)
			.filter((name) => usesUniform(shaderSource, `u_${name}`));

		const uniforms: Record<string, unknown> = {
			u_texture: ctx.prop("u_texture"),
			u_resolution: ctx.prop("u_resolution"),
			u_time: ctx.prop("u_time"),
		};
		if (bindSource) uniforms.u_source = ctx.prop("u_source");
		for (const name of textureNames) {
			uniforms[`u_${name}`] = ctx.prop(`u_${name}`);
		}
		for (const p of def.parameters) {
			uniforms[`u_${p.name}`] = ctx.prop(`u_${p.name}`);
		}

		const cmd = ctx.createEffectCommand({
			vertexShader: pass.vertexShader,
			fragmentShader: pass.fragmentShader,
			uniforms,
		});

		// Pre-allocate scratch props including the framebuffer slot.
		const props: Record<string, unknown> = {
			u_texture: undefined,
			u_resolution: undefined,
			u_time: undefined,
			framebuffer: undefined,
		};
		if (bindSource) props.u_source = undefined;
		for (const name of textureNames) props[`u_${name}`] = undefined;
		for (const p of def.parameters) props[`u_${p.name}`] = undefined;

		return { cmd, props, input: pass.input, bindSource, textureNames };
	});

	return { passes };
}

function ensureAuxTextures(
	ctx: ReglContext,
	def: EffectDefinition,
	cache: Map<string, Texture2D>,
): void {
	if (!def.textures) return;
	for (const t of def.textures) {
		const key = `${def.id}:${t.name}`;
		if (cache.has(key)) continue;
		const data = typeof t.data === "function" ? t.data() : t.data;
		cache.set(key, ctx.createDataTexture(t.width, t.height, data, t.filter));
	}
}

function applyParams(
	props: Record<string, unknown>,
	def: EffectDefinition,
	effect: EffectInstance,
	enumMaps: Map<string, Map<string, number>>,
): void {
	for (const p of def.parameters) {
		const name = `u_${p.name}`;
		const val = effect.parameters[p.name];
		const resolved = val === undefined ? p.default : val;
		switch (p.type) {
			case "bool":
				props[name] = resolved ? 1.0 : 0.0;
				break;
			case "int":
			case "float":
				props[name] = resolved;
				break;
			case "enum":
				props[name] = enumMaps.get(p.name)?.get(resolved as string) ?? 0;
				break;
			case "vec2":
			case "color":
				props[name] =
					val === undefined ? (p.default as readonly number[]).slice() : val;
				break;
		}
	}
}

/** Returns the input Texture2D if no effects ran, else the last Framebuffer2D. */
export function renderEffectChain(
	params: RenderChainParams,
): Texture2D | Framebuffer2D {
	const {
		ctx,
		texture,
		effects,
		fbos,
		scratchFbos,
		commandCache,
		auxTextureCache,
		resolution,
		time,
	} = params;

	let readIndex = 0;
	let passCount = 0;

	for (const effect of effects) {
		if (!effect.enabled) continue;

		const def = getEffect(effect.effectId);
		if (!def) continue;

		const enumMaps = getEnumMaps(def);

		// Cache keyed by effectId — all instances of the same effect type share
		// one set of DrawCommands (regl shares the GPU program anyway; this
		// collapses the JS-side cache to N entries where N = distinct effect types).
		let entry = commandCache.get(effect.effectId);
		if (!entry) {
			entry = buildEffectCommand(ctx, def);
			commandCache.set(effect.effectId, entry);
		}
		ensureAuxTextures(ctx, def, auxTextureCache);

		const effectInput: Texture2D | Framebuffer2D =
			passCount === 0 ? texture : fbos[readIndex];
		const outerWrite = fbos[1 - readIndex];
		const { passes } = entry;
		const lastIndex = passes.length - 1;
		let previous: Texture2D | Framebuffer2D = effectInput;

		for (let i = 0; i < passes.length; i++) {
			const pass = passes[i];
			const { props } = pass;

			const primaryInput =
				pass.input === "source" || i === 0 ? effectInput : previous;
			// Intermediate passes ping-pong through scratch; the final pass writes
			// the effect's output target. scratchFbos is guaranteed non-null by the
			// caller whenever a multi-pass effect is present.
			const target =
				i === lastIndex
					? outerWrite
					: (scratchFbos as readonly [Framebuffer2D, Framebuffer2D])[i % 2];

			props.u_texture = primaryInput;
			props.u_resolution = resolution;
			props.u_time = time;
			if (pass.bindSource) props.u_source = effectInput;
			for (const name of pass.textureNames) {
				props[`u_${name}`] = auxTextureCache.get(`${def.id}:${name}`);
			}
			applyParams(props, def, effect, enumMaps);

			props.framebuffer = target;
			pass.cmd(props);
			previous = target;
		}

		readIndex = 1 - readIndex;
		passCount++;
	}

	return passCount > 0 ? fbos[readIndex] : texture;
}

/** True when the chain contains an enabled effect that needs scratch framebuffers. */
export function chainNeedsScratch(effects: readonly EffectInstance[]): boolean {
	for (const effect of effects) {
		if (!effect.enabled) continue;
		const def = getEffect(effect.effectId);
		if (def?.passes && def.passes.length > 1) return true;
	}
	return false;
}
