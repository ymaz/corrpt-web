import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerEffect } from "@/effects/registry";
import type { EffectDefinition, EffectInstance } from "@/effects/types";
import { createEffectChainRenderer } from "../createEffectChainRenderer";

const TEST_EFFECT_ID = "cecr-test-effect";

registerEffect({
	id: TEST_EFFECT_ID,
	name: "CECR Test",
	category: "noise",
	description: "",
	parameters: [
		{
			name: "amount",
			label: "Amount",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
		},
	],
	vertexShader: "",
	fragmentShader: "",
} satisfies EffectDefinition);

function makeInstance(overrides?: Partial<EffectInstance>): EffectInstance {
	return {
		instanceId: "cecr-i1",
		effectId: TEST_EFFECT_ID,
		enabled: true,
		parameters: { amount: 0.5 },
		...overrides,
	};
}

function makeOutputMaterial() {
	return {
		uniforms: {
			u_texture: { value: null as THREE.Texture | null },
			u_resolution: { value: new THREE.Vector2() },
		},
	} as unknown as THREE.ShaderMaterial;
}

function makeGl() {
	return {
		setRenderTarget: vi.fn(),
		render: vi.fn(),
	} as unknown as THREE.WebGLRenderer;
}

function setup() {
	const gl = makeGl();
	const outputMaterial = makeOutputMaterial();
	const renderer = createEffectChainRenderer({ gl, outputMaterial });
	return { gl, outputMaterial, renderer };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createEffectChainRenderer", () => {
	describe("setImage", () => {
		it("sets u_texture on outputMaterial", () => {
			const { renderer, outputMaterial } = setup();
			const tex = {} as THREE.Texture;
			renderer.setImage(tex);
			expect(outputMaterial.uniforms.u_texture.value).toBe(tex);
		});

		it("is a no-op after dispose", () => {
			const { renderer, outputMaterial } = setup();
			renderer.dispose();
			renderer.setImage({} as THREE.Texture);
			expect(outputMaterial.uniforms.u_texture.value).toBeNull();
		});
	});

	describe("resize", () => {
		it("updates u_resolution on outputMaterial", () => {
			const { renderer, outputMaterial } = setup();
			renderer.resize(800, 600);
			expect(outputMaterial.uniforms.u_resolution.value.x).toBe(800);
			expect(outputMaterial.uniforms.u_resolution.value.y).toBe(600);
		});

		it("does not dispose FBOs when called again with the same dimensions", () => {
			const disposeSpy = vi.spyOn(THREE.WebGLRenderTarget.prototype, "dispose");
			const { renderer } = setup();
			renderer.resize(100, 100);
			disposeSpy.mockClear();
			renderer.resize(100, 100);
			expect(disposeSpy).not.toHaveBeenCalled();
		});

		it("disposes old FBOs when dimensions change", () => {
			const disposeSpy = vi.spyOn(THREE.WebGLRenderTarget.prototype, "dispose");
			const { renderer } = setup();
			renderer.resize(100, 100);
			disposeSpy.mockClear();
			renderer.resize(200, 200);
			expect(disposeSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("renderFrame", () => {
		it("is a no-op when no texture is set", () => {
			const { renderer, gl } = setup();
			renderer.resize(100, 100);
			renderer.renderFrame(0);
			expect(gl.render).not.toHaveBeenCalled();
		});

		it("is a no-op before resize (width/height still 0)", () => {
			const { renderer, gl } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.renderFrame(0);
			expect(gl.render).not.toHaveBeenCalled();
		});

		it("does not call gl.render when effects list is empty", () => {
			const { renderer, gl } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([]);
			renderer.renderFrame(0);
			expect(gl.render).not.toHaveBeenCalled();
		});

		it("sets u_texture to original texture when effects list is empty", () => {
			const { renderer, outputMaterial } = setup();
			const tex = {} as THREE.Texture;
			renderer.setImage(tex);
			renderer.resize(100, 100);
			renderer.setEffects([]);
			renderer.renderFrame(0);
			expect(outputMaterial.uniforms.u_texture.value).toBe(tex);
		});

		it("calls gl.render once per enabled effect", () => {
			const { renderer, gl } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-r1" }),
				makeInstance({ instanceId: "cecr-r2" }),
			]);
			renderer.renderFrame(0);
			expect(gl.render).toHaveBeenCalledTimes(2);
		});

		it("is a no-op after dispose", () => {
			const { renderer, gl } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([makeInstance()]);
			renderer.dispose();
			renderer.renderFrame(0);
			expect(gl.render).not.toHaveBeenCalled();
		});
	});

	describe("setEffects", () => {
		it("is a no-op when called with the same array reference", () => {
			const disposeSpy = vi.spyOn(THREE.ShaderMaterial.prototype, "dispose");
			const { renderer } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			const effects = [makeInstance({ instanceId: "cecr-same-ref" })];
			renderer.setEffects(effects);
			renderer.renderFrame(0);
			disposeSpy.mockClear();
			renderer.setEffects(effects);
			expect(disposeSpy).not.toHaveBeenCalled();
		});

		it("disposes material for a removed effect", () => {
			const disposeSpy = vi.spyOn(THREE.ShaderMaterial.prototype, "dispose");
			const { renderer } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-evict-a" }),
				makeInstance({ instanceId: "cecr-evict-b" }),
			]);
			renderer.renderFrame(0);
			disposeSpy.mockClear();
			renderer.setEffects([makeInstance({ instanceId: "cecr-evict-b" })]);
			expect(disposeSpy).toHaveBeenCalledTimes(1);
		});

		it("does not dispose materials when instance IDs are unchanged", () => {
			const disposeSpy = vi.spyOn(THREE.ShaderMaterial.prototype, "dispose");
			const { renderer } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([makeInstance({ instanceId: "cecr-keep-a" })]);
			renderer.renderFrame(0);
			disposeSpy.mockClear();
			renderer.setEffects([
				makeInstance({
					instanceId: "cecr-keep-a",
					parameters: { amount: 0.9 },
				}),
			]);
			expect(disposeSpy).not.toHaveBeenCalled();
		});

		it("disposes replaced effect when same-length swap occurs", () => {
			// Exercises the nextEffects.some(id not in set) branch of haveEffectInstanceIdsChanged,
			// which is unreachable via a length-change alone.
			const disposeSpy = vi.spyOn(THREE.ShaderMaterial.prototype, "dispose");
			const { renderer } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-swap-a" }),
				makeInstance({ instanceId: "cecr-swap-b" }),
			]);
			renderer.renderFrame(0);
			disposeSpy.mockClear();
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-swap-a" }),
				makeInstance({ instanceId: "cecr-swap-c" }),
			]);
			expect(disposeSpy).toHaveBeenCalledTimes(1);
		});

		it("is a no-op after dispose", () => {
			const disposeSpy = vi.spyOn(THREE.ShaderMaterial.prototype, "dispose");
			const { renderer } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([makeInstance({ instanceId: "cecr-postdisp-a" })]);
			renderer.renderFrame(0);
			renderer.dispose();
			disposeSpy.mockClear();
			renderer.setEffects([makeInstance({ instanceId: "cecr-postdisp-b" })]);
			expect(disposeSpy).not.toHaveBeenCalled();
		});
	});

	describe("dispose", () => {
		it("disposes both FBOs created during resize", () => {
			const disposeSpy = vi.spyOn(THREE.WebGLRenderTarget.prototype, "dispose");
			const { renderer } = setup();
			renderer.resize(100, 100);
			disposeSpy.mockClear();
			renderer.dispose();
			expect(disposeSpy).toHaveBeenCalledTimes(2);
		});

		it("disposes all cached materials", () => {
			const disposeSpy = vi.spyOn(THREE.ShaderMaterial.prototype, "dispose");
			const { renderer } = setup();
			renderer.setImage({} as THREE.Texture);
			renderer.resize(100, 100);
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-disp-a" }),
				makeInstance({ instanceId: "cecr-disp-b" }),
			]);
			renderer.renderFrame(0);
			disposeSpy.mockClear();
			renderer.dispose();
			expect(disposeSpy).toHaveBeenCalledTimes(2);
		});

		it("disposes the offscreen geometry", () => {
			const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
			const { renderer } = setup();
			renderer.dispose();
			expect(disposeSpy).toHaveBeenCalled();
		});

		it("is idempotent: calling dispose twice does not throw", () => {
			const { renderer } = setup();
			renderer.resize(100, 100);
			expect(() => {
				renderer.dispose();
				renderer.dispose();
			}).not.toThrow();
		});
	});

	describe("resize after dispose", () => {
		it("is a no-op: does not create new FBOs", () => {
			const disposeSpy = vi.spyOn(THREE.WebGLRenderTarget.prototype, "dispose");
			const { renderer } = setup();
			renderer.dispose();
			disposeSpy.mockClear();
			renderer.resize(100, 100);
			expect(disposeSpy).not.toHaveBeenCalled();
		});
	});
});
