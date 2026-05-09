import * as THREE from "three";

import { getEffect } from "@/effects/registry";
import type { EffectDefinition, EffectInstance } from "@/effects/types";

export interface RenderChainParams {
	gl: THREE.WebGLRenderer;
	texture: THREE.Texture;
	effects: readonly EffectInstance[];
	fbos: readonly [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
	offScreen: { scene: THREE.Scene; camera: THREE.Camera; mesh: THREE.Mesh };
	materialCache: Map<string, THREE.ShaderMaterial>;
	resolution: THREE.Vector2;
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

/**
 * Runs the multi-pass FBO effect chain and returns the final output texture.
 * Pure rendering function — no React/R3F dependencies, callable from export code.
 */
export function renderEffectChain(params: RenderChainParams): THREE.Texture {
	const {
		gl,
		texture,
		effects,
		fbos,
		offScreen,
		materialCache,
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

		// Get or create cached material
		let mat = materialCache.get(effect.instanceId);
		if (!mat) {
			const uniforms: Record<string, THREE.IUniform> = {
				u_texture: { value: null },
				u_resolution: { value: new THREE.Vector2() },
				u_time: { value: 0 },
			};
			for (const p of def.parameters) {
				const uniformName = `u_${p.name}`;
				switch (p.type) {
					case "bool":
						uniforms[uniformName] = { value: p.default ? 1.0 : 0.0 };
						break;
					case "int":
					case "float":
						uniforms[uniformName] = { value: p.default };
						break;
					case "enum":
						uniforms[uniformName] = {
							value: enumMaps.get(p.name)?.get(p.default) ?? 0,
						};
						break;
					case "vec2":
						uniforms[uniformName] = {
							value: new THREE.Vector2(p.default[0], p.default[1]),
						};
						break;
					case "color":
						uniforms[uniformName] = {
							value: new THREE.Vector3(
								p.default[0],
								p.default[1],
								p.default[2],
							),
						};
						break;
				}
			}
			mat = new THREE.ShaderMaterial({
				vertexShader: def.vertexShader,
				fragmentShader: def.fragmentShader,
				uniforms,
			});
			materialCache.set(effect.instanceId, mat);
		}

		// First actual pass reads original texture; subsequent read previous FBO
		const inputTexture = passCount === 0 ? texture : fbos[readIndex].texture;
		mat.uniforms.u_texture.value = inputTexture;
		mat.uniforms.u_resolution.value.copy(resolution);
		mat.uniforms.u_time.value = time;

		for (const p of def.parameters) {
			const uniformName = `u_${p.name}`;
			if (!(uniformName in mat.uniforms)) continue;
			const val = effect.parameters[p.name];
			if (val === undefined) continue;

			switch (p.type) {
				case "bool":
					mat.uniforms[uniformName].value = val ? 1.0 : 0.0;
					break;
				case "int":
				case "float":
					mat.uniforms[uniformName].value = val;
					break;
				case "enum":
					mat.uniforms[uniformName].value =
						enumMaps.get(p.name)?.get(val as string) ?? 0;
					break;
				case "vec2": {
					const v = val as [number, number];
					(mat.uniforms[uniformName].value as THREE.Vector2).set(v[0], v[1]);
					break;
				}
				case "color": {
					const c = val as [number, number, number];
					(mat.uniforms[uniformName].value as THREE.Vector3).set(
						c[0],
						c[1],
						c[2],
					);
					break;
				}
			}
		}

		// Render to write FBO
		const writeIndex = 1 - readIndex;
		offScreen.mesh.material = mat;
		gl.setRenderTarget(fbos[writeIndex]);
		gl.render(offScreen.scene, offScreen.camera);

		// Swap for next pass
		readIndex = writeIndex;
		passCount++;
	}

	gl.setRenderTarget(null);

	// Return final output texture (or original if all effects were skipped)
	return passCount > 0 ? fbos[readIndex].texture : texture;
}
