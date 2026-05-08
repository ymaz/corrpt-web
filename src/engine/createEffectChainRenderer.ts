import * as THREE from "three";

import { renderEffectChain } from "@/effects/renderEffectChain";
import type { EffectInstance } from "@/effects/types";

interface CreateEffectChainRendererOptions {
	gl: THREE.WebGLRenderer;
	outputMaterial: THREE.ShaderMaterial;
}

export interface EffectChainRenderer {
	setImage: (texture: THREE.Texture | null) => void;
	setEffects: (effects: readonly EffectInstance[]) => void;
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

function haveEffectInstanceIdsChanged(
	currentEffects: readonly EffectInstance[],
	nextEffects: readonly EffectInstance[],
): boolean {
	if (currentEffects.length !== nextEffects.length) return true;

	const currentIds = new Set(currentEffects.map((effect) => effect.instanceId));
	return nextEffects.some((effect) => !currentIds.has(effect.instanceId));
}

export function createEffectChainRenderer({
	gl,
	outputMaterial,
}: CreateEffectChainRendererOptions): EffectChainRenderer {
	let texture: THREE.Texture | null = null;
	let effects: readonly EffectInstance[] = [];
	let fbos: readonly [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null =
		null;
	let width = 0;
	let height = 0;
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
		const activeSet = new Set(effects.map((effect) => effect.instanceId));
		const inactiveIds: string[] = [];

		for (const [id, material] of materialCache) {
			if (!activeSet.has(id)) {
				material.dispose();
				inactiveIds.push(id);
			}
		}

		for (const id of inactiveIds) {
			materialCache.delete(id);
		}
	};

	return {
		setImage(nextTexture) {
			if (disposed) return;
			texture = nextTexture;
			setOutputTexture(nextTexture);
		},

		setEffects(nextEffects) {
			if (disposed) return;
			if (nextEffects === effects) return;
			const instanceIdsChanged = haveEffectInstanceIdsChanged(
				effects,
				nextEffects,
			);
			effects = nextEffects;
			if (instanceIdsChanged) {
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
			if (width === 0 || height === 0) return;

			if (effects.length === 0) {
				setOutputTexture(texture);
				return;
			}

			if (!fbos) {
				fbos = createRenderTargets(width, height);
			}

			const outputTexture = renderEffectChain({
				gl,
				texture,
				effects,
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
