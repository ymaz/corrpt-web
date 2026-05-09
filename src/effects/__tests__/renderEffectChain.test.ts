import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { registerEffect } from "../registry";
import { renderEffectChain } from "../renderEffectChain";
import type { EffectDefinition, EffectInstance } from "../types";

const RC_EFFECT_ID = "rc-chain-effect";

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

function makeInstance(overrides?: Partial<EffectInstance>): EffectInstance {
	return {
		instanceId: "rc-i1",
		effectId: RC_EFFECT_ID,
		enabled: true,
		parameters: { intensity: 0.5, active: false },
		...overrides,
	};
}

function setup(
	effects: EffectInstance[] = [],
	cache = new Map<string, THREE.ShaderMaterial>(),
) {
	const gl = {
		setRenderTarget: vi.fn(),
		render: vi.fn(),
	} as unknown as THREE.WebGLRenderer;
	const texture = {} as THREE.Texture;
	const fboTextures = [{} as THREE.Texture, {} as THREE.Texture];
	const fbos = [{ texture: fboTextures[0] }, { texture: fboTextures[1] }] as [
		THREE.WebGLRenderTarget,
		THREE.WebGLRenderTarget,
	];

	return {
		params: {
			gl,
			texture,
			effects,
			fbos,
			offScreen: {
				scene: {} as THREE.Scene,
				camera: {} as THREE.Camera,
				mesh: { material: null } as unknown as THREE.Mesh,
			},
			materialCache: cache,
			resolution: new THREE.Vector2(100, 100),
			time: 1.5,
		},
		gl,
		texture,
		fboTextures,
		fbos,
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

	it("always restores default render target via setRenderTarget(null)", () => {
		const { params, gl } = setup([]);
		renderEffectChain(params);
		expect(gl.setRenderTarget).toHaveBeenCalledWith(null);
	});

	it("calls gl.render once per enabled effect", () => {
		const { params, gl } = setup([
			makeInstance(),
			makeInstance({ instanceId: "rc-i2" }),
		]);
		renderEffectChain(params);
		expect(gl.render).toHaveBeenCalledTimes(2);
	});

	it("single effect: writes to fbos[1] and returns fbos[1].texture", () => {
		const { params, fbos, fboTextures } = setup([makeInstance()]);
		const result = renderEffectChain(params);
		expect(params.gl.setRenderTarget).toHaveBeenCalledWith(fbos[1]);
		expect(result).toBe(fboTextures[1]);
	});

	it("two effects: ping-pongs fbos and returns fbos[0].texture", () => {
		const { params, fbos, fboTextures } = setup([
			makeInstance(),
			makeInstance({ instanceId: "rc-i2" }),
		]);
		const result = renderEffectChain(params);
		expect(params.gl.setRenderTarget).toHaveBeenNthCalledWith(1, fbos[1]);
		expect(params.gl.setRenderTarget).toHaveBeenNthCalledWith(2, fbos[0]);
		expect(result).toBe(fboTextures[0]);
	});

	it("creates a ShaderMaterial and stores it in materialCache", () => {
		const cache = new Map<string, THREE.ShaderMaterial>();
		const { params } = setup(
			[makeInstance({ instanceId: "rc-cache-1" })],
			cache,
		);
		renderEffectChain(params);
		expect(cache.get("rc-cache-1")).toBeInstanceOf(THREE.ShaderMaterial);
	});

	it("reuses cached material on subsequent calls", () => {
		const cache = new Map<string, THREE.ShaderMaterial>();
		const { params } = setup(
			[makeInstance({ instanceId: "rc-reuse-1" })],
			cache,
		);
		renderEffectChain(params);
		const mat = cache.get("rc-reuse-1");
		renderEffectChain(params);
		expect(cache.size).toBe(1);
		expect(cache.get("rc-reuse-1")).toBe(mat);
	});

	it("updates float uniform from instance parameters", () => {
		const cache = new Map<string, THREE.ShaderMaterial>();
		const { params } = setup(
			[
				makeInstance({
					instanceId: "rc-float-1",
					parameters: { intensity: 0.8, active: false },
				}),
			],
			cache,
		);
		renderEffectChain(params);
		expect(cache.get("rc-float-1")!.uniforms.u_intensity.value).toBe(0.8);
	});

	it("maps bool parameter true → 1.0 in uniforms", () => {
		const cache = new Map<string, THREE.ShaderMaterial>();
		const { params } = setup(
			[
				makeInstance({
					instanceId: "rc-bool-t",
					parameters: { intensity: 0.5, active: true },
				}),
			],
			cache,
		);
		renderEffectChain(params);
		expect(cache.get("rc-bool-t")!.uniforms.u_active.value).toBe(1.0);
	});

	it("maps bool parameter false → 0.0 in uniforms", () => {
		const cache = new Map<string, THREE.ShaderMaterial>();
		const { params } = setup(
			[
				makeInstance({
					instanceId: "rc-bool-f",
					parameters: { intensity: 0.5, active: false },
				}),
			],
			cache,
		);
		renderEffectChain(params);
		expect(cache.get("rc-bool-f")!.uniforms.u_active.value).toBe(0.0);
	});

	it("sets u_time uniform from the time param", () => {
		const cache = new Map<string, THREE.ShaderMaterial>();
		const { params } = setup(
			[makeInstance({ instanceId: "rc-time-1" })],
			cache,
		);
		renderEffectChain(params);
		expect(cache.get("rc-time-1")!.uniforms.u_time.value).toBe(1.5);
	});

	it("sets u_texture to original texture on the first pass", () => {
		const cache = new Map<string, THREE.ShaderMaterial>();
		const { params, texture } = setup(
			[makeInstance({ instanceId: "rc-tex-1" })],
			cache,
		);
		renderEffectChain(params);
		expect(cache.get("rc-tex-1")!.uniforms.u_texture.value).toBe(texture);
	});

	it("passthrough: silently skips effects with unknown effectId", () => {
		const { params, texture } = setup([
			makeInstance({ effectId: "does-not-exist" }),
		]);
		expect(renderEffectChain(params)).toBe(texture);
	});
});
