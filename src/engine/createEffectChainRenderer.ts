import * as THREE from "three";

import { renderEffectChain } from "@/effects/renderEffectChain";
import type { EffectParameterValue } from "@/effects/types";

type EffectParameters = Record<string, Record<string, EffectParameterValue>>;

interface CreateEffectChainRendererOptions {
	gl: THREE.WebGLRenderer;
	outputMaterial: THREE.ShaderMaterial;
}

export interface EffectChainRenderer {
	setImage: (texture: THREE.Texture | null) => void;
	setEffects: (activeEffects: string[], parameters: EffectParameters) => void;
	resize: (width: number, height: number) => void;
	renderFrame: (time: number) => void;
	dispose: () => void;
}

function createRenderTargets(
	width: number,
	height: number,
): readonly [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] {
	const options: THREE.RenderTargetOptions = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		type: THREE.UnsignedByteType,
	};
	const a = new THREE.WebGLRenderTarget(width, height, options);
	const b = new THREE.WebGLRenderTarget(width, height, options);
	return [a, b] as const;
}

function createOffScreenScene() {
	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
	camera.position.set(0, 0, 1);
	const geometry = new THREE.PlaneGeometry(1, 1);
	const mesh = new THREE.Mesh(geometry);
	scene.add(mesh);
	return { scene, camera, mesh, geometry };
}

export function createEffectChainRenderer({
	gl,
	outputMaterial,
}: CreateEffectChainRendererOptions): EffectChainRenderer {
	let texture: THREE.Texture | null = null;
	let activeEffects: string[] = [];
	let parameters: EffectParameters = {};
	let fbos: readonly [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null =
		null;
	let width = 1;
	let height = 1;
	let disposed = false;

	const offScreen = createOffScreenScene();
	const materialCache = new Map<string, THREE.ShaderMaterial>();
	const resolution = new THREE.Vector2(width, height);

	const setOutputTexture = (nextTexture: THREE.Texture | null) => {
		const uniform = outputMaterial.uniforms.u_texture;
		if (uniform) {
			uniform.value = nextTexture;
		}
	};

	const syncOutputResolution = () => {
		const uniform = outputMaterial.uniforms.u_resolution;
		if (uniform?.value instanceof THREE.Vector2) {
			uniform.value.copy(resolution);
		}
	};

	const disposeRenderTargets = () => {
		if (!fbos) return;
		fbos[0].dispose();
		fbos[1].dispose();
		fbos = null;
	};

	const disposeInactiveMaterials = () => {
		const activeSet = new Set(activeEffects);
		for (const [id, material] of materialCache) {
			if (!activeSet.has(id)) {
				material.dispose();
				materialCache.delete(id);
			}
		}
	};

	return {
		setImage(nextTexture) {
			if (disposed) return;
			texture = nextTexture;
			setOutputTexture(nextTexture);
		},

		setEffects(nextActiveEffects, nextParameters) {
			if (disposed) return;
			const effectsChanged = activeEffects !== nextActiveEffects;
			activeEffects = nextActiveEffects;
			parameters = nextParameters;
			if (effectsChanged) {
				disposeInactiveMaterials();
			}
		},

		resize(nextWidth, nextHeight) {
			if (disposed) return;
			if (fbos && width === nextWidth && height === nextHeight) return;

			width = nextWidth;
			height = nextHeight;
			resolution.set(width, height);
			syncOutputResolution();

			disposeRenderTargets();
			fbos = createRenderTargets(width, height);
		},

		renderFrame(time) {
			if (disposed || !texture) return;

			if (activeEffects.length === 0) {
				setOutputTexture(texture);
				return;
			}

			if (!fbos) {
				fbos = createRenderTargets(width, height);
			}

			const outputTexture = renderEffectChain({
				gl,
				texture,
				activeEffects,
				parameters,
				fbos,
				offScreen,
				materialCache,
				resolution,
				time,
			});

			setOutputTexture(outputTexture);
		},

		dispose() {
			if (disposed) return;
			disposed = true;

			disposeRenderTargets();
			for (const material of materialCache.values()) {
				material.dispose();
			}
			materialCache.clear();
			offScreen.geometry.dispose();
		},
	};
}
