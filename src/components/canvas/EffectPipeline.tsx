import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import "@/components/canvas/EffectMaterial";
import { getEffect } from "@/effects/registry";
import { useEffectStore } from "@/store/effectStore";

interface EffectPipelineProps {
	texture: THREE.Texture;
}

export function EffectPipeline({ texture }: EffectPipelineProps) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const { viewport, gl } = useThree();

	const image = texture.image as HTMLImageElement;
	const imageWidth = image.width;
	const imageHeight = image.height;
	const imageAspect = imageWidth / imageHeight;
	const viewportAspect = viewport.width / viewport.height;

	let scaleX: number;
	let scaleY: number;

	if (imageAspect > viewportAspect) {
		scaleX = viewport.width;
		scaleY = viewport.width / imageAspect;
	} else {
		scaleY = viewport.height;
		scaleX = viewport.height * imageAspect;
	}

	// Ping-pong FBOs at image dimensions
	const fbos = useMemo(() => {
		const options: THREE.RenderTargetOptions = {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
		};
		const a = new THREE.WebGLRenderTarget(imageWidth, imageHeight, options);
		const b = new THREE.WebGLRenderTarget(imageWidth, imageHeight, options);
		return [a, b] as const;
	}, [imageWidth, imageHeight]);

	// Dispose FBOs on cleanup
	useEffect(() => {
		return () => {
			fbos[0].dispose();
			fbos[1].dispose();
		};
	}, [fbos]);

	// Off-screen scene for multi-pass rendering
	const offScreen = useMemo(() => {
		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
		camera.position.set(0, 0, 1);
		const geometry = new THREE.PlaneGeometry(1, 1);
		const mesh = new THREE.Mesh(geometry);
		scene.add(mesh);
		return { scene, camera, mesh, geometry };
	}, []);

	// Dispose off-screen geometry on unmount
	useEffect(() => {
		return () => {
			offScreen.geometry.dispose();
		};
	}, [offScreen]);

	// Material cache: effect ID → ShaderMaterial
	const materialCacheRef = useRef<Map<string, THREE.ShaderMaterial>>(new Map());

	// Clean up materials for effects no longer active
	const activeEffects = useEffectStore((s) => s.activeEffects);

	useEffect(() => {
		const cache = materialCacheRef.current;
		const activeSet = new Set(activeEffects);
		for (const [id, mat] of cache) {
			if (!activeSet.has(id)) {
				mat.dispose();
				cache.delete(id);
			}
		}
	}, [activeEffects]);

	// Dispose all cached materials on unmount
	useEffect(() => {
		const cache = materialCacheRef.current;
		return () => {
			for (const mat of cache.values()) {
				mat.dispose();
			}
			cache.clear();
		};
	}, []);

	// Elapsed time accumulator
	const timeRef = useRef(0);

	// Reusable Vector2 for resolution uniform — avoids per-frame allocation
	const resolutionRef = useRef(new THREE.Vector2());

	useFrame((_state, delta) => {
		timeRef.current += delta;

		if (!materialRef.current) return;

		const { activeEffects, parameters } = useEffectStore.getState();

		// No active effects — display original texture directly
		if (activeEffects.length === 0) {
			materialRef.current.uniforms.u_texture.value = texture;
			return;
		}

		const cache = materialCacheRef.current;
		resolutionRef.current.set(imageWidth, imageHeight);
		let readIndex = 0;
		let passCount = 0;

		for (let i = 0; i < activeEffects.length; i++) {
			const effectId = activeEffects[i];
			const def = getEffect(effectId);
			if (!def) continue;

			// Get or create cached material
			let mat = cache.get(effectId);
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
				cache.set(effectId, mat);
			}

			// First actual pass reads original texture; subsequent read previous FBO
			const inputTexture = passCount === 0 ? texture : fbos[readIndex].texture;
			mat.uniforms.u_texture.value = inputTexture;
			mat.uniforms.u_resolution.value.copy(resolutionRef.current);
			mat.uniforms.u_time.value = timeRef.current;

			// Update effect-specific uniforms from store parameters
			const params = parameters[effectId];
			if (params && def.parameters.length > 0) {
				for (const p of def.parameters) {
					const uniformName = `u_${p.name}`;
					if (uniformName in mat.uniforms) {
						const val = params[p.name];
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

		// Set visible mesh to final output (or original if all effects were skipped)
		materialRef.current.uniforms.u_texture.value =
			passCount > 0 ? fbos[readIndex].texture : texture;
	});

	return (
		<mesh scale={[scaleX, scaleY, 1]}>
			<planeGeometry args={[1, 1]} />
			<passthroughMaterial
				ref={materialRef}
				u_texture={texture}
				u_resolution={new THREE.Vector2(imageWidth, imageHeight)}
			/>
		</mesh>
	);
}
