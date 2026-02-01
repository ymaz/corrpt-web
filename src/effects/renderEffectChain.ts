import * as THREE from "three";

import { getEffect } from "@/effects/registry";

export interface RenderChainParams {
	gl: THREE.WebGLRenderer;
	texture: THREE.Texture;
	activeEffects: string[];
	parameters: Record<string, Record<string, number | boolean>>;
	fbos: readonly [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
	offScreen: { scene: THREE.Scene; camera: THREE.Camera; mesh: THREE.Mesh };
	materialCache: Map<string, THREE.ShaderMaterial>;
	resolution: THREE.Vector2;
	time: number;
}

/**
 * Runs the multi-pass FBO effect chain and returns the final output texture.
 * Pure rendering function — no React/R3F dependencies, callable from export code.
 */
export function renderEffectChain(params: RenderChainParams): THREE.Texture {
	const {
		gl,
		texture,
		activeEffects,
		parameters,
		fbos,
		offScreen,
		materialCache,
		resolution,
		time,
	} = params;

	let readIndex = 0;
	let passCount = 0;

	for (let i = 0; i < activeEffects.length; i++) {
		const effectId = activeEffects[i];
		const def = getEffect(effectId);
		if (!def) continue;

		// Get or create cached material
		let mat = materialCache.get(effectId);
		if (!mat) {
			const uniforms: Record<string, THREE.IUniform> = {
				u_texture: { value: null },
				u_resolution: { value: new THREE.Vector2() },
				u_time: { value: 0 },
			};
			for (const p of def.parameters) {
				const uniformName = `u_${p.name}`;
				uniforms[uniformName] = {
					value: p.type === "bool" ? (p.default ? 1.0 : 0.0) : p.default,
				};
			}
			mat = new THREE.ShaderMaterial({
				vertexShader: def.vertexShader,
				fragmentShader: def.fragmentShader,
				uniforms,
			});
			materialCache.set(effectId, mat);
		}

		// First actual pass reads original texture; subsequent read previous FBO
		const inputTexture = passCount === 0 ? texture : fbos[readIndex].texture;
		mat.uniforms.u_texture.value = inputTexture;
		mat.uniforms.u_resolution.value.copy(resolution);
		mat.uniforms.u_time.value = time;

		// Update effect-specific uniforms from store parameters
		const effectParams = parameters[effectId];
		if (effectParams && def.parameters.length > 0) {
			for (const p of def.parameters) {
				const uniformName = `u_${p.name}`;
				if (uniformName in mat.uniforms) {
					const val = effectParams[p.name];
					if (val !== undefined) {
						mat.uniforms[uniformName].value =
							p.type === "bool" ? (val ? 1.0 : 0.0) : val;
					}
				}
			}
		}

		// Render to write FBO
		const writeIndex = 1 - readIndex;
		offScreen.mesh.material = mat;
		gl.setRenderTarget(fbos[writeIndex]);
		gl.render(offScreen.scene, offScreen.camera);
		gl.setRenderTarget(null);

		// Swap for next pass
		readIndex = writeIndex;
		passCount++;
	}

	// Return final output texture (or original if all effects were skipped)
	return passCount > 0 ? fbos[readIndex].texture : texture;
}
