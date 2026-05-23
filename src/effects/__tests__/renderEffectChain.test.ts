import type { DrawCommand, Framebuffer2D, Texture2D } from "regl";
import { describe, expect, it, vi } from "vitest";

import type { ReglContext } from "@/engine/reglContext";
import { registerEffect } from "../registry";
import { type CachedEffect, renderEffectChain } from "../renderEffectChain";
import type { EffectDefinition, EffectInstance } from "../types";

const RC_EFFECT_ID = "rc-chain-effect";
const RC_ENUM_EFFECT_ID = "rc-enum-effect";
const RC_MULTIPASS_ID = "rc-multipass-effect";
const RC_TEXTURE_ID = "rc-texture-effect";

registerEffect({
	id: RC_EFFECT_ID,
	name: "RC Test",
	category: "noise",
	description: "",
	parameters: [
		{
			name: "intensity",
			label: "Intensity",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
		},
		{ name: "active", label: "Active", type: "bool", default: false },
	],
	vertexShader: "",
	fragmentShader: "",
} satisfies EffectDefinition);

registerEffect({
	id: RC_ENUM_EFFECT_ID,
	name: "RC Enum Test",
	category: "noise",
	description: "",
	parameters: [
		{
			name: "mode",
			label: "Mode",
			type: "enum",
			default: "b",
			options: [
				{ label: "A", value: "a" },
				{ label: "B", value: "b" },
				{ label: "C", value: "c" },
			],
		},
	],
	vertexShader: "",
	fragmentShader: "",
} satisfies EffectDefinition);

// Three passes: pass 0 and 1 are intermediate (scratch), pass 2 composites the
// original via u_source. Exercises ping-pong, "source" input, and u_source.
registerEffect({
	id: RC_MULTIPASS_ID,
	name: "RC Multipass",
	category: "aesthetic",
	description: "",
	parameters: [],
	vertexShader: "vert",
	fragmentShader: "ignored",
	passes: [
		{ fragmentShader: "// blur-h\ntexture2D(u_texture, vUv);" },
		{ fragmentShader: "// blur-v\ntexture2D(u_texture, vUv);" },
		{
			fragmentShader: "// composite\ntexture2D(u_source, vUv);",
			input: "source",
		},
	],
} satisfies EffectDefinition);

// Single-pass effect with one auxiliary LUT texture sampled as u_lut.
registerEffect({
	id: RC_TEXTURE_ID,
	name: "RC Texture",
	category: "color",
	description: "",
	parameters: [],
	textures: [
		{
			name: "lut",
			width: 2,
			height: 1,
			data: new Uint8Array(8),
			filter: "nearest",
		},
	],
	vertexShader: "vert",
	fragmentShader: "texture2D(u_lut, vUv);",
} satisfies EffectDefinition);

function makeInstance(overrides?: Partial<EffectInstance>): EffectInstance {
	return {
		instanceId: "rc-i1",
		effectId: RC_EFFECT_ID,
		enabled: true,
		parameters: { intensity: 0.5, active: false },
		...overrides,
	};
}

interface DrawCall {
	framebuffer: Framebuffer2D;
	props: Record<string, unknown>;
}

type CacheMap = Map<string, CachedEffect>;

function setup(effects: EffectInstance[] = [], cache: CacheMap = new Map()) {
	const calls: DrawCall[] = [];

	const createEffectCommand = vi.fn((): DrawCommand => {
		const cmd = vi.fn((props: Record<string, unknown>) => {
			const { framebuffer, ...rest } = props;
			calls.push({ framebuffer: framebuffer as Framebuffer2D, props: rest });
		}) as unknown as DrawCommand;
		return cmd;
	});

	const dataTextures: Texture2D[] = [];
	const createDataTexture = vi.fn((): Texture2D => {
		const tex = {
			__id: `data-tex-${dataTextures.length}`,
		} as unknown as Texture2D;
		dataTextures.push(tex);
		return tex;
	});

	const ctx = {
		prop: (name: string) => name,
		createEffectCommand,
		createDataTexture,
	} as unknown as ReglContext;

	const texture = { __id: "tex" } as unknown as Texture2D;
	const fbos = [
		{ __id: "fbo0" } as unknown as Framebuffer2D,
		{ __id: "fbo1" } as unknown as Framebuffer2D,
	] as [Framebuffer2D, Framebuffer2D];
	const scratchFbos = [
		{ __id: "scratch0" } as unknown as Framebuffer2D,
		{ __id: "scratch1" } as unknown as Framebuffer2D,
	] as [Framebuffer2D, Framebuffer2D];
	const auxTextureCache = new Map<string, Texture2D>();

	return {
		params: {
			ctx,
			texture,
			effects,
			fbos,
			scratchFbos,
			commandCache: cache,
			auxTextureCache,
			resolution: [100, 100] as [number, number],
			time: 1.5,
		},
		ctx,
		createEffectCommand,
		createDataTexture,
		calls,
		texture,
		fbos,
		scratchFbos,
		auxTextureCache,
		cache,
	};
}

describe("renderEffectChain", () => {
	it("passthrough: returns original texture when effects list is empty", () => {
		const { params, texture } = setup([]);
		expect(renderEffectChain(params)).toBe(texture);
	});

	it("passthrough: returns original texture when all effects are disabled", () => {
		const { params, texture } = setup([
			makeInstance({ enabled: false }),
			makeInstance({ instanceId: "rc-i2", enabled: false }),
		]);
		expect(renderEffectChain(params)).toBe(texture);
	});

	it("invokes the draw command once per enabled effect", () => {
		const { params, calls } = setup([
			makeInstance(),
			makeInstance({ instanceId: "rc-i2" }),
		]);
		renderEffectChain(params);
		expect(calls).toHaveLength(2);
	});

	it("single effect: writes to fbos[1] and returns fbos[1]", () => {
		const { params, fbos, calls } = setup([makeInstance()]);
		const result = renderEffectChain(params);
		expect(calls[0].framebuffer).toBe(fbos[1]);
		expect(result).toBe(fbos[1]);
	});

	it("two effects: ping-pongs fbos and returns fbos[0]", () => {
		const { params, fbos, calls } = setup([
			makeInstance(),
			makeInstance({ instanceId: "rc-i2" }),
		]);
		const result = renderEffectChain(params);
		expect(calls[0].framebuffer).toBe(fbos[1]);
		expect(calls[1].framebuffer).toBe(fbos[0]);
		expect(result).toBe(fbos[0]);
	});

	it("creates a CachedCommand entry keyed by effectId", () => {
		const cache: CacheMap = new Map();
		const { params } = setup(
			[makeInstance({ instanceId: "rc-cache-1" })],
			cache,
		);
		renderEffectChain(params);
		expect(cache.has(RC_EFFECT_ID)).toBe(true);
	});

	it("reuses the cached command on subsequent calls", () => {
		const cache: CacheMap = new Map();
		const { params, createEffectCommand } = setup(
			[makeInstance({ instanceId: "rc-reuse-1" })],
			cache,
		);
		renderEffectChain(params);
		const entry = cache.get(RC_EFFECT_ID);
		renderEffectChain(params);
		expect(cache.size).toBe(1);
		expect(cache.get(RC_EFFECT_ID)).toBe(entry);
		expect(createEffectCommand).toHaveBeenCalledTimes(1);
	});

	it("two instances of the same effectId share one CachedCommand", () => {
		const cache: CacheMap = new Map();
		const { params, createEffectCommand } = setup(
			[
				makeInstance({ instanceId: "rc-a" }),
				makeInstance({ instanceId: "rc-b" }),
			],
			cache,
		);
		renderEffectChain(params);
		expect(createEffectCommand).toHaveBeenCalledTimes(1);
		expect(cache.size).toBe(1);
	});

	it("passes the float instance parameter as a uniform prop", () => {
		const { params, calls } = setup([
			makeInstance({
				instanceId: "rc-float-1",
				parameters: { intensity: 0.8, active: false },
			}),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_intensity).toBe(0.8);
	});

	it("maps bool parameter true → 1.0", () => {
		const { params, calls } = setup([
			makeInstance({
				instanceId: "rc-bool-t",
				parameters: { intensity: 0.5, active: true },
			}),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_active).toBe(1.0);
	});

	it("maps bool parameter false → 0.0", () => {
		const { params, calls } = setup([
			makeInstance({
				instanceId: "rc-bool-f",
				parameters: { intensity: 0.5, active: false },
			}),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_active).toBe(0.0);
	});

	it("passes the time parameter as u_time", () => {
		const { params, calls } = setup([
			makeInstance({ instanceId: "rc-time-1" }),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_time).toBe(1.5);
	});

	it("uses original texture as u_texture on the first pass", () => {
		const { params, texture, calls } = setup([
			makeInstance({ instanceId: "rc-tex-1" }),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_texture).toBe(texture);
	});

	it("passthrough: silently skips effects with unknown effectId", () => {
		const { params, texture } = setup([
			makeInstance({ effectId: "does-not-exist" }),
		]);
		expect(renderEffectChain(params)).toBe(texture);
	});

	it("maps enum default value to its option index", () => {
		const { params, calls } = setup([
			{
				instanceId: "rc-enum-init",
				effectId: RC_ENUM_EFFECT_ID,
				enabled: true,
				parameters: { mode: "b" },
			},
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_mode).toBe(1);
	});

	it("maps enum instance parameter to its option index", () => {
		const { params, calls } = setup([
			{
				instanceId: "rc-enum-update",
				effectId: RC_ENUM_EFFECT_ID,
				enabled: true,
				parameters: { mode: "c" },
			},
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_mode).toBe(2);
	});

	it("falls back to 0 for an unknown enum value", () => {
		const { params, calls } = setup([
			{
				instanceId: "rc-enum-unknown",
				effectId: RC_ENUM_EFFECT_ID,
				enabled: true,
				parameters: { mode: "unknown" },
			},
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_mode).toBe(0);
	});

	describe("multi-pass effects", () => {
		const multipass = (): EffectInstance => ({
			instanceId: "rc-mp-1",
			effectId: RC_MULTIPASS_ID,
			enabled: true,
			parameters: {},
		});

		it("compiles one DrawCommand per declared pass", () => {
			const { params, createEffectCommand } = setup([multipass()]);
			renderEffectChain(params);
			expect(createEffectCommand).toHaveBeenCalledTimes(3);
		});

		it("invokes every pass and writes the final pass to the outer target", () => {
			const { params, calls, fbos, scratchFbos } = setup([multipass()]);
			const result = renderEffectChain(params);
			expect(calls).toHaveLength(3);
			// Intermediate passes ping-pong through scratch.
			expect(calls[0].framebuffer).toBe(scratchFbos[0]);
			expect(calls[1].framebuffer).toBe(scratchFbos[1]);
			// Final pass writes the outer FBO and is the returned target.
			expect(calls[2].framebuffer).toBe(fbos[1]);
			expect(result).toBe(fbos[1]);
		});

		it('feeds the prior pass output forward and honors input: "source"', () => {
			const { params, calls, texture, scratchFbos } = setup([multipass()]);
			renderEffectChain(params);
			// Pass 0 reads the effect input (the original texture here).
			expect(calls[0].props.u_texture).toBe(texture);
			// Pass 1 reads pass 0's scratch output.
			expect(calls[1].props.u_texture).toBe(scratchFbos[0]);
			// Pass 2 declared input "source" → reads the effect input again.
			expect(calls[2].props.u_texture).toBe(texture);
		});

		it("binds u_source only on passes whose shader references it", () => {
			const { params, calls, texture } = setup([multipass()]);
			renderEffectChain(params);
			expect(calls[0].props.u_source).toBeUndefined();
			expect(calls[1].props.u_source).toBeUndefined();
			// The composite pass samples u_source → bound to the effect input.
			expect(calls[2].props.u_source).toBe(texture);
		});
	});

	describe("auxiliary textures", () => {
		const withTexture = (): EffectInstance => ({
			instanceId: "rc-tex-i1",
			effectId: RC_TEXTURE_ID,
			enabled: true,
			parameters: {},
		});

		it("creates each declared texture once and caches it", () => {
			const { params, createDataTexture, auxTextureCache } = setup([
				withTexture(),
			]);
			renderEffectChain(params);
			renderEffectChain(params);
			expect(createDataTexture).toHaveBeenCalledTimes(1);
			expect(auxTextureCache.has(`${RC_TEXTURE_ID}:lut`)).toBe(true);
		});

		it("binds the cached texture as u_lut on the pass that samples it", () => {
			const { params, calls, auxTextureCache } = setup([withTexture()]);
			renderEffectChain(params);
			expect(calls[0].props.u_lut).toBe(
				auxTextureCache.get(`${RC_TEXTURE_ID}:lut`),
			);
		});
	});
});
